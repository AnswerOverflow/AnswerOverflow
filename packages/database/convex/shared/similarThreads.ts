import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../client";
import { CHANNEL_TYPE } from "./channels";
import { getFirstMessageInChannel } from "./messages";

export async function findSimilarThreads(
	ctx: QueryCtx,
	args: {
		searchQuery: string;
		currentThreadId: bigint;
		currentServerId: bigint;
		serverId?: bigint;
		limit: number;
	},
): Promise<Doc<"messages">[]> {
	const { searchQuery, currentThreadId, currentServerId, serverId, limit } =
		args;

	if (!searchQuery.trim()) {
		return [];
	}

	const [threadsByName, messageResults] = await Promise.all([
		ctx.db
			.query("channels")
			.withSearchIndex("search_name", (q) => {
				const search = q
					.search("name", searchQuery)
					.eq("type", CHANNEL_TYPE.PublicThread);
				if (serverId) {
					return search.eq("serverId", serverId);
				}
				return search;
			})
			.take(limit * 4),
		ctx.db
			.query("messages")
			.withSearchIndex("search_content", (q) => {
				const search = q.search("content", searchQuery);
				if (serverId) {
					return search.eq("serverId", serverId);
				}
				return search;
			})
			.take(limit * 4),
	]);

	const threadIdsFromMessages = new Set(
		Arr.filter(
			messageResults.map((m) =>
				m.parentChannelId ? m.channelId.toString() : null,
			),
			Predicate.isNotNull,
		),
	);

	const threadIdsFromNameSearch = new Set(
		threadsByName.map((t) => t.id.toString()),
	);

	const allThreadIds = new Set([
		...threadIdsFromNameSearch,
		...threadIdsFromMessages,
	]);
	allThreadIds.delete(currentThreadId.toString());

	const threadServerMap = new Map<string, bigint>();
	for (const thread of threadsByName) {
		threadServerMap.set(thread.id.toString(), thread.serverId);
	}
	for (const message of messageResults) {
		if (message.parentChannelId) {
			threadServerMap.set(message.channelId.toString(), message.serverId);
		}
	}

	const sortedThreadIds = Array.from(allThreadIds).sort((a, b) => {
		const aIsSameServer = threadServerMap.get(a) === currentServerId;
		const bIsSameServer = threadServerMap.get(b) === currentServerId;
		if (aIsSameServer && !bIsSameServer) return -1;
		if (!aIsSameServer && bIsSameServer) return 1;

		const aFromName = threadIdsFromNameSearch.has(a);
		const bFromName = threadIdsFromNameSearch.has(b);
		if (aFromName && !bFromName) return -1;
		if (!aFromName && bFromName) return 1;

		return 0;
	});

	const firstMessages = await Promise.all(
		sortedThreadIds.slice(0, limit * 2).map(async (threadIdStr) => {
			const threadId = BigInt(threadIdStr);
			const cachedThread = threadsByName.find((t) => t.id === threadId);
			if (cachedThread && !cachedThread.parentId) return null;

			if (!cachedThread) {
				const thread = await getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					threadId,
					"id",
				);
				if (!thread || !thread.parentId) return null;
			}

			return await getFirstMessageInChannel(ctx, threadId);
		}),
	);

	return Arr.take(Arr.filter(firstMessages, Predicate.isNotNull), limit);
}
