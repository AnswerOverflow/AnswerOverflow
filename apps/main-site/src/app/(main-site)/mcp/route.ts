import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { Database } from "@packages/database/database";
import { Effect } from "effect";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { runtime } from "@/lib/runtime";

function withToolSpan<T>(
	toolName: string,
	args: Record<string, unknown>,
	effect: Effect.Effect<T, unknown, Database>,
	getResultCount?: (result: T) => number,
): Effect.Effect<T, unknown, Database> {
	return effect.pipe(
		Effect.tap((result) =>
			Effect.annotateCurrentSpan({
				"mcp.tool.success": true,
				...(getResultCount
					? { "mcp.tool.result_count": getResultCount(result) }
					: {}),
			}),
		),
		Effect.tapError((error) =>
			Effect.annotateCurrentSpan({
				"mcp.tool.success": false,
				"mcp.tool.error": String(error),
			}),
		),
		Effect.withSpan(`mcp.tool.${toolName}`, {
			attributes: {
				"mcp.tool.name": toolName,
				"mcp.tool.args": JSON.stringify(args),
			},
		}),
	);
}

function snowflakeToTimestamp(snowflake: bigint): Date {
	const DISCORD_EPOCH = 1420070400000n;
	const timestamp = Number((snowflake >> 22n) + DISCORD_EPOCH);
	return new Date(timestamp);
}

function toEnhancedSearchResult(result: SearchResult) {
	const { message, channel, server, thread } = result;
	const threadId = thread?.id ?? message.message.id;
	const messageTimestamp = snowflakeToTimestamp(message.message.id);

	const firstSolution = message.solutions[0];
	const solutionTimestamp = firstSolution
		? snowflakeToTimestamp(firstSolution.id)
		: null;

	return {
		threadId: threadId.toString(),
		threadTitle: thread?.name,
		serverName: server.name,
		serverId: server.discordId.toString(),
		serverMemberCount: server.approximateMemberCount,
		channelName: channel.name,
		channelId: channel.id.toString(),
		question: {
			content: message.message.content,
			author: message.author?.name ?? null,
			timestamp: messageTimestamp.toISOString(),
		},
		solution: firstSolution
			? {
					content: firstSolution.content,
					timestamp: solutionTimestamp?.toISOString() ?? null,
				}
			: null,
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
					"Search for answers on Answer Overflow - a searchable archive of Discord help channels.\n\nUse this to find solutions to programming questions, library-specific issues, and community discussions.\n\nTips for effective searching:\n- Use specific error messages or function names\n- Filter by serverId to search within a specific community (e.g., Effect Discord, Next.js Discord)\n- Use search_servers first to discover available communities and their IDs",
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
							"Filter results to a specific Discord server. Use search_servers to find server IDs.",
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
				const args = { query, serverId, channelId, limit };
				const results = await withToolSpan(
					"search_answeroverflow",
					args,
					Effect.gen(function* () {
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
					}),
					(r) => r.page.length,
				).pipe(runtime.runPromise);
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
			"search_servers",
			{
				title: "Search Discord Servers",
				description:
					"Search for Discord servers indexed on Answer Overflow by name.\n\nUse this to discover communities and get their server IDs for filtered searching.\nResults are sorted by member count (largest first).\n\nExamples:\n- 'Effect' to find the Effect Community Discord\n- 'React' to find React-related servers\n- 'Next' to find Next.js servers",
				inputSchema: z.object({
					query: z
						.string()
						.optional()
						.describe(
							"Search query to filter servers by name. Leave empty to list all servers.",
						),
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
			async ({ query, limit }) => {
				const args = { query, limit };
				const servers = await withToolSpan(
					"search_servers",
					args,
					Effect.gen(function* () {
						const database = yield* Database;
						const allServers =
							yield* database.public.servers.getCachedBrowsableServers({});

						const filteredServers = query
							? allServers.filter((s) =>
									s.name.toLowerCase().includes(query.toLowerCase()),
								)
							: allServers;

						return filteredServers.slice(0, limit ?? 25);
					}),
					(r) => r.length,
				).pipe(runtime.runPromise);

				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(
								{
									servers: servers.map((s) => ({
										id: s.discordId,
										name: s.name,
										description: s.description,
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
				const args = { threadId, limit };
				const result = await withToolSpan(
					"get_thread_messages",
					args,
					Effect.gen(function* () {
						const database = yield* Database;

						const headerData =
							yield* database.public.messages.getMessagePageHeaderData({
								messageId: BigInt(threadId),
							});

						if (!headerData) {
							return null;
						}

						const channelId = headerData.threadId ?? headerData.canonicalId;
						const firstMessageId = headerData.firstMessage?.message.id;

						const messages = yield* database.public.messages.getMessages({
							channelId,
							after: firstMessageId ? firstMessageId - 1n : 0n,
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
					}),
					(r) => r?.messages.length ?? 0,
				).pipe(runtime.runPromise);

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

				const formatMessage = (m: {
					message: { id: bigint; content: string };
					author?: { name: string } | null;
					solutions: Array<{ id: bigint }>;
					attachments: Array<{ filename: string; url: string }>;
				}) => ({
					id: m.message.id.toString(),
					content: m.message.content,
					author: m.author?.name ?? null,
					timestamp: snowflakeToTimestamp(m.message.id).toISOString(),
					isSolution: m.solutions.length > 0,
					attachments: m.attachments.map((a) => ({
						filename: a.filename,
						url: a.url,
					})),
				});

				const firstMessage = result.headerData.firstMessage;
				const firstMessageId = firstMessage?.message.id;

				const messagesFromQuery = result.messages.filter(
					(m) => m.message.id !== firstMessageId,
				);

				const allMessages = firstMessage
					? [
							formatMessage(firstMessage),
							...messagesFromQuery.map(formatMessage),
						]
					: messagesFromQuery.map(formatMessage);

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
					messages: allMessages,
					totalMessages: allMessages.length,
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
				const args = { query, serverId, limit };
				const results = await withToolSpan(
					"find_similar_threads",
					args,
					Effect.gen(function* () {
						const database = yield* Database;
						const similar = yield* database.public.search.getSimilarThreads({
							searchQuery: query,
							currentThreadId: "0",
							currentServerId: serverId,
							serverId,
							limit: limit ?? 5,
						});
						return similar;
					}),
					(r) => r.length,
				).pipe(runtime.runPromise);

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
