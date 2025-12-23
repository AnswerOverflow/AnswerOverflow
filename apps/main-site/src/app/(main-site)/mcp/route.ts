import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { runtime } from "@/lib/runtime";

function snowflakeToTimestamp(snowflake: bigint): Date {
	const DISCORD_EPOCH = 1420070400000n;
	const timestamp = Number((snowflake >> 22n) + DISCORD_EPOCH);
	return new Date(timestamp);
}

function toEnhancedSearchResult(result: SearchResult) {
	const { message, channel, server, thread } = result;
	const threadId = thread?.id ?? message.message.id;
	const messageTimestamp = snowflakeToTimestamp(message.message.id);

	return {
		threadId: threadId.toString(),
		threadTitle: thread?.name,
		serverName: server.name,
		serverId: server.discordId.toString(),
		serverMemberCount: server.approximateMemberCount,
		channelName: channel.name,
		channelId: channel.id.toString(),
		message: {
			content: message.message.content,
			timestamp: messageTimestamp.toISOString(),
			hasSolution: message.solutions.length > 0,
		},
		author: message.author?.name ?? null,
		url: `https://www.answeroverflow.com/m/${threadId}`,
	};
}

const handler = createMcpHandler(
	(server) => {
		server.registerTool(
			"search_answeroverflow",
			{
				title: "Search Answer Overflow",
				description:
					"Search for answers on Answer Overflow - a searchable archive of Discord help channels.\n\nUse this to find solutions to programming questions, library-specific issues, and community discussions.\n\nTips for effective searching:\n- Use specific error messages or function names\n- Filter by serverId to search within a specific community (e.g., Effect Discord, Next.js Discord)\n- Use list_servers first to discover available communities and their IDs",
				inputSchema: z.object({
					query: z
						.string()
						.describe(
							"The search query - can be error messages, function names, concepts, etc.",
						),
					serverId: z
						.string()
						.optional()
						.describe(
							"Filter results to a specific Discord server. Use list_servers to find server IDs.",
						),
					channelId: z
						.string()
						.optional()
						.describe("Filter results to a specific channel within a server."),
					limit: z
						.number()
						.min(1)
						.max(25)
						.default(10)
						.optional()
						.describe("Maximum number of results to return (1-25, default 10)"),
				}),
			},
			async ({ query, serverId, channelId, limit }) => {
				const results = await Effect.gen(function* () {
					const database = yield* Database;
					const searchResults = yield* database.public.search.publicSearch({
						query,
						serverId,
						channelId,
						paginationOpts: {
							numItems: limit ?? 10,
							cursor: null,
						},
					});
					return searchResults;
				}).pipe(runtime.runPromise);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									results: results.page.map(toEnhancedSearchResult),
									hasMore: !results.isDone,
									totalReturned: results.page.length,
								},
								null,
								2,
							),
						},
					],
				};
			},
		);

		server.registerTool(
			"list_servers",
			{
				title: "List Available Servers",
				description:
					"List all Discord servers indexed on Answer Overflow.\n\nUse this to discover communities and get their server IDs for filtered searching.\nResults are sorted by member count (largest first).",
				inputSchema: z.object({
					limit: z
						.number()
						.min(1)
						.max(100)
						.default(25)
						.optional()
						.describe(
							"Maximum number of servers to return (1-100, default 25)",
						),
				}),
			},
			async ({ limit }) => {
				const servers = await Effect.gen(function* () {
					const database = yield* Database;
					const allServers = yield* database.private.servers.getBrowseServers(
						{},
					);
					return allServers.slice(0, limit ?? 25);
				}).pipe(runtime.runPromise);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									servers: servers.map((s) => ({
										id: s.discordId.toString(),
										name: s.name,
										description: s.description ?? null,
										memberCount: s.approximateMemberCount,
										icon: s.icon
											? `https://cdn.discordapp.com/icons/${s.discordId}/${s.icon}.png`
											: null,
									})),
									totalReturned: servers.length,
								},
								null,
								2,
							),
						},
					],
				};
			},
		);

		server.registerTool(
			"get_server_channels",
			{
				title: "Get Server Channels",
				description:
					"Get all indexed channels for a specific Discord server.\n\nUse this after list_servers to see what channels are available for searching within a community.",
				inputSchema: z.object({
					serverId: z
						.string()
						.describe("The Discord server ID (use list_servers to find this)"),
				}),
			},
			async ({ serverId }) => {
				const result = await Effect.gen(function* () {
					const database = yield* Database;
					const serverWithChannels =
						yield* database.private.servers.getServerByDiscordIdWithChannels({
							discordId: BigInt(serverId),
						});
					return serverWithChannels;
				}).pipe(runtime.runPromise);

				if (!result) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "Server not found", serverId }),
							},
						],
					};
				}

				const channelTypes: Record<number, string> = {
					0: "text",
					5: "announcement",
					15: "forum",
				};

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									server: {
										id: result.server.discordId.toString(),
										name: result.server.name,
										description: result.server.description ?? null,
									},
									channels: result.channels.map((c) => ({
										id: c.id.toString(),
										name: c.name,
										type: channelTypes[c.type] ?? `unknown (${c.type})`,
									})),
									totalChannels: result.channels.length,
								},
								null,
								2,
							),
						},
					],
				};
			},
		);

		server.registerTool(
			"read_thread",
			{
				title: "Read Thread",
				description:
					"Read the full content of a thread from Answer Overflow.\n\nUse this after searching to get complete thread details including:\n- The original question/post\n- Solution (if marked)\n- Server and channel context\n- Direct link to view on Answer Overflow",
				inputSchema: z.object({
					threadId: z.string().describe("The thread ID from search results"),
				}),
			},
			async ({ threadId }) => {
				const thread = await Effect.gen(function* () {
					const database = yield* Database;
					const data = yield* database.public.messages.getMessagePageHeaderData(
						{
							messageId: BigInt(threadId),
						},
					);
					return data;
				}).pipe(runtime.runPromise);

				if (!thread) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "Thread not found", threadId }),
							},
						],
					};
				}

				const firstMessageTimestamp = thread.firstMessage
					? snowflakeToTimestamp(thread.firstMessage.message.id)
					: null;

				const response = {
					threadId: (thread.threadId ?? thread.canonicalId).toString(),
					title: thread.thread?.name ?? null,
					url: `https://www.answeroverflow.com/m/${thread.canonicalId}`,
					server: {
						id: thread.server.discordId.toString(),
						name: thread.server.name,
						description: thread.server.description ?? null,
					},
					channel: {
						id: thread.channel.id.toString(),
						name: thread.channel.name,
					},
					question: thread.firstMessage
						? {
								content: thread.firstMessage.message.content,
								author: thread.firstMessage.author?.name ?? null,
								timestamp: firstMessageTimestamp?.toISOString() ?? null,
								attachments: thread.firstMessage.attachments.map((a) => ({
									filename: a.filename,
									url: a.url,
									contentType: a.contentType ?? null,
								})),
							}
						: null,
					solution: thread.solutionMessage
						? {
								content: thread.solutionMessage.message.content,
								author: thread.solutionMessage.author?.name ?? null,
								timestamp: snowflakeToTimestamp(
									thread.solutionMessage.message.id,
								).toISOString(),
							}
						: null,
					hasSolution: thread.solutionMessage !== null,
				};

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(response, null, 2),
						},
					],
				};
			},
		);

		server.registerTool(
			"get_thread_messages",
			{
				title: "Get Thread Messages",
				description:
					"Get all messages in a thread, not just the first message and solution.\n\nUse this when you need to see the full conversation, follow-up questions, and all responses in a thread.",
				inputSchema: z.object({
					threadId: z
						.string()
						.describe(
							"The thread ID (which is also the channel ID for the thread)",
						),
					limit: z
						.number()
						.min(1)
						.max(100)
						.default(50)
						.optional()
						.describe(
							"Maximum number of messages to return (1-100, default 50)",
						),
				}),
			},
			async ({ threadId, limit }) => {
				const result = await Effect.gen(function* () {
					const database = yield* Database;

					const headerData =
						yield* database.public.messages.getMessagePageHeaderData({
							messageId: BigInt(threadId),
						});

					if (!headerData) {
						return null;
					}

					const channelId = headerData.threadId ?? headerData.canonicalId;
					const startMessageId = headerData.firstMessage?.message.id ?? 0n;

					const messages = yield* database.public.messages.getMessages({
						channelId,
						after: startMessageId - 1n,
						paginationOpts: {
							numItems: limit ?? 50,
							cursor: null,
						},
					});

					return {
						headerData,
						messages: messages.page,
						hasMore: !messages.isDone,
					};
				}).pipe(runtime.runPromise);

				if (!result) {
					return {
						content: [
							{
								type: "text",
								text: JSON.stringify({ error: "Thread not found", threadId }),
							},
						],
					};
				}

				const response = {
					threadId: (
						result.headerData.threadId ?? result.headerData.canonicalId
					).toString(),
					title: result.headerData.thread?.name ?? null,
					url: `https://www.answeroverflow.com/m/${result.headerData.canonicalId}`,
					server: {
						id: result.headerData.server.discordId.toString(),
						name: result.headerData.server.name,
					},
					messages: result.messages.map((m) => ({
						id: m.message.id.toString(),
						content: m.message.content,
						author: m.author?.name ?? null,
						timestamp: snowflakeToTimestamp(m.message.id).toISOString(),
						isSolution: m.solutions.length > 0,
						attachments: m.attachments.map((a) => ({
							filename: a.filename,
							url: a.url,
						})),
					})),
					totalMessages: result.messages.length,
					hasMore: result.hasMore,
				};

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(response, null, 2),
						},
					],
				};
			},
		);

		server.registerTool(
			"find_similar_threads",
			{
				title: "Find Similar Threads",
				description:
					"Find threads similar to a given search query, useful for finding related discussions.\n\nThis searches both thread titles and message content to find relevant conversations.",
				inputSchema: z.object({
					query: z
						.string()
						.describe("The search query to find similar threads for"),
					serverId: z.string().describe("The server ID to search within"),
					limit: z
						.number()
						.min(1)
						.max(10)
						.default(5)
						.optional()
						.describe(
							"Maximum number of similar threads to return (1-10, default 5)",
						),
				}),
			},
			async ({ query, serverId, limit }) => {
				const results = await Effect.gen(function* () {
					const database = yield* Database;
					const similar = yield* database.public.search.getSimilarThreads({
						searchQuery: query,
						currentThreadId: "0",
						currentServerId: serverId,
						serverId,
						limit: limit ?? 5,
					});
					return similar;
				}).pipe(runtime.runPromise);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									threads: results.map((r) => ({
										threadId: (r.thread?.id ?? r.message.message.id).toString(),
										title: r.thread?.name ?? null,
										content:
											r.message.message.content.slice(0, 300) +
											(r.message.message.content.length > 300 ? "..." : ""),
										author: r.message.author?.name ?? null,
										timestamp: snowflakeToTimestamp(
											r.message.message.id,
										).toISOString(),
										hasSolution: r.message.solutions.length > 0,
										serverName: r.server.name,
										channelName: r.channel.name,
										url: `https://www.answeroverflow.com/m/${r.thread?.id ?? r.message.message.id}`,
									})),
									totalReturned: results.length,
								},
								null,
								2,
							),
						},
					],
				};
			},
		);
	},
	{},
	{
		basePath: "/",
		maxDuration: 60,
	},
);

export { handler as GET, handler as POST };
