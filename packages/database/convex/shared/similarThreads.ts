import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../client";
import { CHANNEL_TYPE } from "./channels";
import { getThreadStarterMessages } from "./messages";

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

	const fetchLimit = limit * 2;

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
			.take(fetchLimit),
		ctx.db
			.query("messages")
			.withSearchIndex("search_content", (q) => {
				const search = q.search("content", searchQuery);
				if (serverId) {
					return search.eq("serverId", serverId);
				}
				return search;
			})
			.take(fetchLimit),
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

	const firstMessages = await getThreadStarterMessages(
		ctx,
		validThreadIds.map((id) => BigInt(id)),
	);

	const orderedMessages = Arr.filter(
		validThreadIds.map((id) => firstMessages[id] ?? null),
		Predicate.isNotNull,
	);

	return Arr.take(orderedMessages, limit);
}
