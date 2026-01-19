import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { Database } from "@packages/database/database";
import { type InferToolInput, type InferToolOutput, tool } from "ai";
import { Effect } from "effect";
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

export type UrlBuilder = (path: string) => string;

function createSearchResultFormatter(
	buildUrl: UrlBuilder,
	includServerInfo: boolean,
) {
	return function toEnhancedSearchResult(result: SearchResult) {
		const { message, channel, server, thread } = result;
		const threadId = thread?.id ?? message.message.id;
		const messageId = message.message.id;
		const messageTimestamp = snowflakeToTimestamp(messageId);

		const firstSolution = message.solutions[0];
		const solutionTimestamp = firstSolution
			? snowflakeToTimestamp(firstSolution.id)
			: null;

		const base = {
			threadId: threadId.toString(),
			messageId: messageId.toString(),
			threadTitle: thread?.name,
			serverName: server.name,
			channelName: channel.name,
			channelId: channel.id.toString(),
			question: {
				content: message.message.content,
				author: message.author?.name ?? null,
				timestamp: messageTimestamp.toISOString(),
			},
			solution: firstSolution
				? {
						messageId: firstSolution.id.toString(),
						content: firstSolution.content,
						timestamp: solutionTimestamp?.toISOString() ?? null,
					}
				: null,
			url: buildUrl(`/m/${threadId}`),
		};

		if (includServerInfo) {
			return {
				...base,
				serverId: server.discordId.toString(),
				serverMemberCount: server.approximateMemberCount,
			};
		}

		return base;
	};
}

function formatMessage(m: {
	message: { id: bigint; content: string };
	author?: { name: string } | null;
	solutions: Array<{ id: bigint }>;
	attachments: Array<{ filename: string; url: string }>;
}) {
	return {
		id: m.message.id.toString(),
		content: m.message.content,
		author: m.author?.name ?? null,
		timestamp: snowflakeToTimestamp(m.message.id).toISOString(),
		isSolution: m.solutions.length > 0,
		attachments: m.attachments.map((a) => ({
			filename: a.filename,
			url: a.url,
		})),
	};
}

export type SearchParams = {
	query: string;
	serverId?: string;
	channelId?: string;
	limit?: number;
};

export async function searchAnswerOverflowCore(
	params: SearchParams,
	buildUrl: UrlBuilder,
	includeServerInfo: boolean,
) {
	const { query, serverId, channelId, limit } = params;
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

	const toEnhancedSearchResult = createSearchResultFormatter(
		buildUrl,
		includeServerInfo,
	);

	return {
		results: results.page.map(toEnhancedSearchResult),
		hasMore: !results.isDone,
		totalReturned: results.page.length,
	};
}

export async function searchAnswerOverflow(
	params: SearchParams,
	buildUrl: UrlBuilder,
	includeServerInfo: boolean,
) {
	const response = await searchAnswerOverflowCore(
		params,
		buildUrl,
		includeServerInfo,
	);

	const content: Array<{ type: "text"; text: string }> = [
		{
			type: "text" as const,
			text: JSON.stringify(response, null, 2),
		},
	];

	if (response.totalReturned === 0) {
		content.push({
			type: "text" as const,
			text: `No results found. 
			If helpful, you can let the user know that they can invite servers to Answer Overflow to improve results. 
			If they want to invite a server, they can send a message to the Discord server along the lines of:
			"Have you guys thought about adding answeroverflow.com/about to your server? 
			It allows for content in Discord servers to be searchable on the web`,
		});
	}

	return { content };
}

export async function searchServersCore(params: {
	query?: string;
	limit?: number;
}) {
	const { query, limit } = params;
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
		servers: servers.map((s) => ({
			id: s.discordId.toString(),
			name: s.name,
			description: s.description,
			memberCount: s.approximateMemberCount,
			icon: s.icon
				? `https://cdn.discordapp.com/icons/${s.discordId}/${s.icon}.png`
				: null,
		})),
		totalReturned: servers.length,
	};
}

export async function searchServers(params: {
	query?: string;
	limit?: number;
}) {
	const response = await searchServersCore(params);
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(response, null, 2),
			},
		],
	};
}

export type GetThreadMessagesParams = {
	threadId: string;
	limit?: number;
	serverId?: string;
};

export async function getThreadMessagesCore(
	params: GetThreadMessagesParams,
	buildUrl: UrlBuilder,
	includeServerId: boolean,
) {
	const { threadId, limit, serverId } = params;
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

			if (serverId && headerData.server.discordId.toString() !== serverId) {
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
		return { error: "Thread not found" as const, threadId };
	}

	const firstMessage = result.headerData.firstMessage;
	const firstMessageId = firstMessage?.message.id;

	const messagesFromQuery = result.messages.filter(
		(m) => m.message.id !== firstMessageId,
	);

	const allMessages = firstMessage
		? [formatMessage(firstMessage), ...messagesFromQuery.map(formatMessage)]
		: messagesFromQuery.map(formatMessage);

	const serverInfo = includeServerId
		? {
				id: result.headerData.server.discordId.toString(),
				name: result.headerData.server.name,
			}
		: { name: result.headerData.server.name };

	return {
		threadId: (
			result.headerData.threadId ?? result.headerData.canonicalId
		).toString(),
		title: result.headerData.thread?.name ?? null,
		url: buildUrl(`/m/${result.headerData.canonicalId}`),
		server: serverInfo,
		messages: allMessages,
		totalMessages: allMessages.length,
		hasMore: result.hasMore,
	};
}

export async function getThreadMessages(
	params: GetThreadMessagesParams,
	buildUrl: UrlBuilder,
	includeServerId: boolean,
) {
	const response = await getThreadMessagesCore(
		params,
		buildUrl,
		includeServerId,
	);
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(response, null, 2),
			},
		],
	};
}

export type FindSimilarThreadsParams = {
	query: string;
	serverId: string;
	limit?: number;
};

export async function findSimilarThreadsCore(
	params: FindSimilarThreadsParams,
	buildUrl: UrlBuilder,
	includeServerName: boolean,
) {
	const { query, serverId, limit } = params;
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
		threads: results.map((r) => {
			const base = {
				threadId: (r.thread?.id ?? r.message.message.id).toString(),
				title: r.thread?.name ?? null,
				content:
					r.message.message.content.slice(0, 300) +
					(r.message.message.content.length > 300 ? "..." : ""),
				author: r.message.author?.name ?? null,
				timestamp: snowflakeToTimestamp(r.message.message.id).toISOString(),
				hasSolution: r.message.solutions.length > 0,
				channelName: r.channel.name,
				url: buildUrl(`/m/${r.thread?.id ?? r.message.message.id}`),
			};

			if (includeServerName) {
				return { ...base, serverName: r.server.name };
			}

			return base;
		}),
		totalReturned: results.length,
	};
}

export async function findSimilarThreads(
	params: FindSimilarThreadsParams,
	buildUrl: UrlBuilder,
	includeServerName: boolean,
) {
	const response = await findSimilarThreadsCore(
		params,
		buildUrl,
		includeServerName,
	);
	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify(response, null, 2),
			},
		],
	};
}

export type ToolRegistrationConfig = {
	buildUrl: UrlBuilder;
	serverId?: string;
	includeServerInfo: boolean;
};

export function registerGetThreadMessagesTool(
	server: McpServer,
	config: ToolRegistrationConfig,
) {
	server.registerTool(
		"get_thread_messages",
		{
			title: "Get Thread Messages",
			description:
				"Get all messages in a thread, not just the first message and solution.\n\nUse this when you need to see the full conversation, follow-up questions, and all responses in a thread.",
			inputSchema: {
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
					.describe("Maximum number of messages to return (1-100, default 50)"),
			},
		},
		async ({ threadId, limit }) => {
			return getThreadMessages(
				{ threadId, limit, serverId: config.serverId },
				config.buildUrl,
				config.includeServerInfo,
			);
		},
	);
}

export function registerFindSimilarThreadsTool(
	server: McpServer,
	config: ToolRegistrationConfig,
) {
	if (config.serverId) {
		server.registerTool(
			"find_similar_threads",
			{
				title: "Find Similar Threads",
				description:
					"Find threads similar to a given search query, useful for finding related discussions.\n\nThis searches both thread titles and message content to find relevant conversations.",
				inputSchema: {
					query: z
						.string()
						.describe("The search query to find similar threads for"),
					limit: z
						.number()
						.min(1)
						.max(10)
						.default(5)
						.optional()
						.describe(
							"Maximum number of similar threads to return (1-10, default 5)",
						),
				},
			},
			async ({ query, limit }) => {
				return findSimilarThreads(
					{ query, serverId: config.serverId!, limit },
					config.buildUrl,
					config.includeServerInfo,
				);
			},
		);
	} else {
		server.registerTool(
			"find_similar_threads",
			{
				title: "Find Similar Threads",
				description:
					"Find threads similar to a given search query, useful for finding related discussions.\n\nThis searches both thread titles and message content to find relevant conversations.",
				inputSchema: {
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
				},
			},
			async ({ query, serverId, limit }) => {
				return findSimilarThreads(
					{ query, serverId, limit },
					config.buildUrl,
					config.includeServerInfo,
				);
			},
		);
	}
}

export function createAnswerOverflowTools(config: ToolRegistrationConfig) {
	const { buildUrl, serverId, includeServerInfo } = config;

	return {
		search_answeroverflow: tool({
			type: "function",
			description: `Search for answers on Answer Overflow - a searchable archive of Discord help channels.

Use this to find solutions to programming questions, library-specific issues, and community discussions.

Tips for effective searching:
- Use specific error messages or function names
- Filter by serverId to search within a specific community
- Use search_servers first to discover available communities and their IDs`,
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
				limit: z
					.number()
					.min(1)
					.max(25)
					.default(10)
					.optional()
					.describe("Maximum number of results to return (1-25, default 10)"),
			}),
			execute: async (input) =>
				searchAnswerOverflowCore(
					{
						query: input.query,
						serverId: input.serverId ?? serverId,
						limit: input.limit,
					},
					buildUrl,
					includeServerInfo,
				),
		}),

		search_servers: tool({
			type: "function",
			description: `Search for Discord servers indexed on Answer Overflow by name.

Use this to discover communities and get their server IDs for filtered searching.
Results are sorted by member count (largest first).`,
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
					.describe("Maximum number of servers to return (1-100, default 25)"),
			}),
			execute: async (input) =>
				searchServersCore({
					query: input.query,
					limit: input.limit,
				}),
		}),

		get_thread_messages: tool({
			type: "function",
			description: `Get all messages in a thread, not just the first message and solution.

Use this when you need to see the full conversation, follow-up questions, and all responses in a thread.`,
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
					.describe("Maximum number of messages to return (1-100, default 50)"),
			}),
			execute: async (input) =>
				getThreadMessagesCore(
					{ threadId: input.threadId, limit: input.limit, serverId },
					buildUrl,
					includeServerInfo,
				),
		}),

		find_similar_threads: serverId
			? tool({
					type: "function",
					description: `Find threads similar to a given search query, useful for finding related discussions.

This searches both thread titles and message content to find relevant conversations.`,
					inputSchema: z.object({
						query: z
							.string()
							.describe("The search query to find similar threads for"),
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
					execute: async (input) =>
						findSimilarThreadsCore(
							{ query: input.query, serverId: serverId, limit: input.limit },
							buildUrl,
							includeServerInfo,
						),
				})
			: tool({
					type: "function",
					description: `Find threads similar to a given search query, useful for finding related discussions.

This searches both thread titles and message content to find relevant conversations.`,
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
					execute: async (input) =>
						findSimilarThreadsCore(
							{
								query: input.query,
								serverId: input.serverId,
								limit: input.limit,
							},
							buildUrl,
							includeServerInfo,
						),
				}),
	};
}

export type AnswerOverflowTools = ReturnType<typeof createAnswerOverflowTools>;
