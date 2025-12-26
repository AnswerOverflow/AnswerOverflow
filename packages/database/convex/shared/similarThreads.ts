import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import { CHANNEL_TYPE } from "./channels";
import type { QueryCtxWithCache } from "./dataAccess";
import { getThreadStartMessage } from "./messages";

export async function findSimilarThreads(
	ctx: QueryCtxWithCache,
	args: {
		searchQuery: string;
		currentThreadId: bigint;
		currentServerId: bigint;
		serverId?: bigint;
		limit: number;
	},
) {
	const { searchQuery, currentThreadId, currentServerId, serverId, limit } =
		args;

	if (!searchQuery.trim()) {
		return [];
	}

	const fetchLimit = Math.ceil(limit * 1.5);
	const searchServerId = serverId ?? currentServerId;

	const [threadsByName, messageResults] = await Promise.all([
		ctx.db
			.query("channels")
			.withSearchIndex("search_name", (q) =>
				q
					.search("name", searchQuery)
					.eq("type", CHANNEL_TYPE.PublicThread)
					.eq("serverId", searchServerId),
			)
			.take(fetchLimit),
		ctx.db
			.query("messages")
			.withSearchIndex("search_content", (q) =>
				q.search("content", searchQuery).eq("serverId", searchServerId),
			)
			.take(fetchLimit),
	]);

	const threadIdsFromMessages = new Set(
		Arr.filter(
			messageResults.flatMap((m) => {
				const ids: Array<string | null> = [];
				if (m.parentChannelId) {
					ids.push(m.channelId.toString());
				}
				if (m.childThreadId) {
					ids.push(m.childThreadId.toString());
				}
				return ids.length > 0 ? ids : [null];
			}),
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
	const threadsByIdMap = new Map<string, Doc<"channels">>();
	for (const thread of threadsByName) {
		const idStr = thread.id.toString();
		threadServerMap.set(idStr, thread.serverId);
		threadsByIdMap.set(idStr, thread);
	}
	for (const message of messageResults) {
		if (message.parentChannelId) {
			threadServerMap.set(message.channelId.toString(), message.serverId);
		}
		if (message.childThreadId) {
			threadServerMap.set(message.childThreadId.toString(), message.serverId);
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

	const candidateThreadIds = sortedThreadIds.slice(0, fetchLimit);

	const unknownThreadIds = Arr.filter(
		candidateThreadIds,
		(id) => !threadsByIdMap.has(id),
	);

	if (unknownThreadIds.length > 0) {
		const unknownThreads = await Promise.all(
			unknownThreadIds.map((idStr) =>
				getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					BigInt(idStr),
					"id",
				),
			),
		);
		for (let i = 0; i < unknownThreadIds.length; i++) {
			const thread = unknownThreads[i];
			const threadId = unknownThreadIds[i];
			if (thread && threadId) {
				threadsByIdMap.set(threadId, thread);
			}
		}
	}

	const validThreadIds = Arr.filter(candidateThreadIds, (idStr) => {
		const thread = threadsByIdMap.get(idStr);
		return thread !== undefined && thread.parentId !== null;
	});

	const firstMessages = await asyncMap(validThreadIds, async (idStr) => {
		return getThreadStartMessage(ctx, BigInt(idStr));
	});
	return Arr.filter(firstMessages, Predicate.isNotNullable).slice(0, limit);
}
