import { getOneFrom } from "convex-helpers/server/relationships";
import type { QueryCtx } from "../client";
import { CHANNEL_TYPE, isChannelIndexingEnabled } from "./channels";
import {
	getFirstMessageInChannel,
	findSolutionsByQuestionId,
} from "./messages";

export type SimilarThread = {
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

export async function findSimilarThreads(
	ctx: QueryCtx,
	args: {
		searchQuery: string;
		currentThreadId: bigint;
		currentServerId: bigint;
		serverId?: bigint;
		limit: number;
	},
): Promise<SimilarThread[]> {
	const { searchQuery, currentThreadId, currentServerId, serverId, limit } =
		args;

	if (!searchQuery.trim()) {
		return [];
	}

	const threadsByName = await ctx.db
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
		.take(limit * 3);

	const messageResults = await ctx.db
		.query("messages")
		.withSearchIndex("search_content", (q) => {
			const search = q.search("content", searchQuery);
			if (serverId) {
				return search.eq("serverId", serverId);
			}
			return search;
		})
		.take(limit * 3);

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

	const results: SimilarThread[] = [];

	for (const threadIdStr of sortedThreadIds) {
		if (results.length >= limit) break;

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

		if (!thread || !thread.parentId) continue;

		const indexingEnabled = await isChannelIndexingEnabled(
			ctx,
			thread.id,
			thread.parentId,
		);
		if (!indexingEnabled) continue;

		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			thread.serverId,
			"discordId",
		);
		if (!server || server.kickedTime) continue;

		const parentChannel = await getOneFrom(
			ctx.db,
			"channels",
			"by_discordChannelId",
			thread.parentId,
			"id",
		);
		if (!parentChannel) continue;

		const firstMessage = await getFirstMessageInChannel(ctx, thread.id);
		if (!firstMessage) continue;

		const solutions = await findSolutionsByQuestionId(ctx, firstMessage.id, 1);
		const hasSolution = solutions.length > 0;

		results.push({
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
			hasSolution,
		});
	}

	return results;
}
