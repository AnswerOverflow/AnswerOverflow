import { getOneFrom } from "convex-helpers/server/relationships";
import type { QueryCtx } from "../client";
import { CHANNEL_TYPE, isChannelIndexingEnabled } from "./channels";
import { isMessagePublic } from "./messagePrivacy";
import {
	findSolutionsByQuestionId,
	getFirstMessageInChannel,
} from "./messages";

export type SimilarThreadCandidate = {
	thread: {
		id: bigint;
		name: string;
		serverId: bigint;
	};
	server: {
		discordId: bigint;
		name: string;
		icon?: string;
	};
	channel: {
		id: bigint;
		name: string;
	};
	firstMessageId: bigint;
	firstMessageContent: string;
	hasSolution: boolean;
};

export async function findSimilarThreadCandidates(
	ctx: QueryCtx,
	args: {
		searchQuery: string;
		currentThreadId: bigint;
		currentServerId: bigint;
		serverId?: bigint;
		limit: number;
	},
): Promise<SimilarThreadCandidate[]> {
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

	const threadIdsFromMessages = new Set<string>();
	const messageThreadMap = new Map<string, bigint>();

	for (const message of messageResults) {
		if (message.parentChannelId) {
			const threadIdStr = message.channelId.toString();
			if (!threadIdsFromMessages.has(threadIdStr)) {
				threadIdsFromMessages.add(threadIdStr);
				messageThreadMap.set(threadIdStr, message.channelId);
			}
		}
	}

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

	const threadIdPriority = new Map<string, number>();
	let priority = 0;
	for (const id of threadIdsFromNameSearch) {
		if (id !== currentThreadId.toString()) {
			threadIdPriority.set(id, priority++);
		}
	}
	for (const id of threadIdsFromMessages) {
		if (!threadIdPriority.has(id) && id !== currentThreadId.toString()) {
			threadIdPriority.set(id, priority++);
		}
	}

	const sortedThreadIds = Array.from(allThreadIds).sort((a, b) => {
		const serverA = threadServerMap.get(a);
		const serverB = threadServerMap.get(b);
		const aIsSameServer = serverA === currentServerId;
		const bIsSameServer = serverB === currentServerId;

		if (aIsSameServer && !bIsSameServer) return -1;
		if (!aIsSameServer && bIsSameServer) return 1;

		const priorityA = threadIdPriority.get(a) ?? Number.MAX_SAFE_INTEGER;
		const priorityB = threadIdPriority.get(b) ?? Number.MAX_SAFE_INTEGER;
		return priorityA - priorityB;
	});

	const processCandidate = async (
		threadIdStr: string,
	): Promise<SimilarThreadCandidate | null> => {
		const threadId = BigInt(threadIdStr);

		const cachedThread = threadsByName.find((t) => t.id === threadId);
		const thread =
			cachedThread ??
			(await getOneFrom(
				ctx.db,
				"channels",
				"by_discordChannelId",
				threadId,
				"id",
			));

		if (!thread || !thread.parentId) return null;

		const [indexingEnabled, server, parentChannel, firstMessage] =
			await Promise.all([
				isChannelIndexingEnabled(ctx, thread.id, thread.parentId),
				getOneFrom(
					ctx.db,
					"servers",
					"by_discordId",
					thread.serverId,
					"discordId",
				),
				getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					thread.parentId,
					"id",
				),
				getFirstMessageInChannel(ctx, thread.id),
			]);

		if (!indexingEnabled) return null;
		if (!server || server.kickedTime) return null;
		if (!parentChannel) return null;
		if (!firstMessage) return null;

		const [serverPreferences, userServerSettings, solutions] =
			await Promise.all([
				getOneFrom(ctx.db, "serverPreferences", "by_serverId", thread.serverId),
				ctx.db
					.query("userServerSettings")
					.withIndex("by_userId_serverId", (q) =>
						q
							.eq("userId", firstMessage.authorId)
							.eq("serverId", thread.serverId),
					)
					.first(),
				findSolutionsByQuestionId(ctx, firstMessage.id, 1),
			]);

		const isPublic = isMessagePublic(
			serverPreferences,
			userServerSettings ?? null,
			thread.serverId,
		);
		if (!isPublic) return null;

		return {
			thread: {
				id: thread.id,
				name: thread.name,
				serverId: thread.serverId,
			},
			server: {
				discordId: server.discordId,
				name: server.name,
				icon: server.icon,
			},
			channel: {
				id: parentChannel.id,
				name: parentChannel.name,
			},
			firstMessageId: firstMessage.id,
			firstMessageContent: firstMessage.content.slice(0, 200),
			hasSolution: solutions.length > 0,
		};
	};

	const candidates: SimilarThreadCandidate[] = [];
	const batchSize = limit;
	let offset = 0;

	while (candidates.length < limit && offset < sortedThreadIds.length) {
		const batch = sortedThreadIds.slice(offset, offset + batchSize);
		const results = await Promise.all(batch.map(processCandidate));

		for (const result of results) {
			if (result !== null) {
				candidates.push(result);
				if (candidates.length >= limit) break;
			}
		}

		offset += batchSize;
	}

	return candidates;
}
