import type { SearchResult } from "@packages/database/convex/shared/dataAccess";
import { Database } from "@packages/database/database";
import { convexToJson } from "convex/values";
import { Effect } from "effect";
import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { runtime } from "@/lib/runtime";

function toMinimalSearchResult(result: SearchResult) {
	const { message, channel, server, thread } = result;
	const threadId = thread?.id ?? message.message.id;
	return {
		threadTitle: thread?.name,
		threadId: threadId.toString(),
		serverName: server.name,
		serverId: server.discordId.toString(),
		channelName: channel.name,
		// todo: maybe include channel description
		message: message.message.content,
		author: message.author?.name,
	};
}

const handler = createMcpHandler(
	(server) => {
		server.registerTool(
			"search_answeroverflow",
			{
				title: "Search Answer Overflow",
				description: "Search for answers on Answer Overflow",
				inputSchema: z.object({
					query: z.string(),
				}),
			},
			async ({ query }) => {
				const results = await Effect.gen(function* () {
					const database = yield* Database;
					const results = yield* database.public.search.publicSearch({
						query,
						paginationOpts: {
							numItems: 10,
							cursor: null,
						},
					});
					return results;
				}).pipe(runtime.runPromise);
				return {
					content: [
						{
							type: "text",
							text: JSON.stringify(results.page.map(toMinimalSearchResult)),
						},
					],
				};
			},
		);
		server.registerTool(
			"read_thread",
			{
				title: "Read Thread",
				description: "Read a thread from Answer Overflow",
				inputSchema: z.object({
					threadId: z.string(),
				}),
			},
			async ({ threadId }) => {
				const thread = await Effect.gen(function* () {
					const database = yield* Database;
					const thread =
						yield* database.public.messages.getMessagePageHeaderData({
							messageId: BigInt(threadId),
						});
					return thread;
				}).pipe(runtime.runPromise);
				return {
					content: [
						{ type: "text", text: JSON.stringify(convexToJson(thread)) },
					],
				};
			},
		);
	},
	{},
	{
		// Optional redis config
		basePath: "/", // this needs to match where the [transport] is located.
		maxDuration: 60,
	},
);
export { handler as GET, handler as POST };
