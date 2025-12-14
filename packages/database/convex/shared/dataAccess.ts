import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import type { QueryCtx } from "../client";
import type { ServerPreferences, UserServerSettings } from "../schema";

type Message = Doc<"messages">;

import {
	getDiscordAccountIdFromAuth,
	getUserServerSettingsForServerByDiscordId,
} from "./auth";
import { isChannelIndexingEnabled } from "./channels";
import {
	isMessagePublic,
	type MessageWithPrivacyFlags,
	shouldAnonymizeMessage,
} from "./messagePrivacy";
import { enrichMessageForDisplay } from "./messages";
import type { EnrichedMessage as SharedEnrichedMessage } from "./shared";

function createRequestCache() {
	const cache = new Map<string, Promise<never>>();

	return {
		get<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
			const existing = cache.get(key);
			if (existing) {
				return existing;
			}
			const promise = fetcher();
			cache.set(key, promise as Promise<never>);
			return promise;
		},
	};
}

export function createDataAccessCache(ctx: QueryCtx) {
	const cache = createRequestCache();

	return {
		getServerPreferences: (serverId: bigint) =>
			cache.get(`serverPreferences:${serverId}`, () =>
				getOneFrom(ctx.db, "serverPreferences", "by_serverId", serverId),
			),

		getUserServerSettings: (userId: bigint, serverId: bigint) =>
			cache.get(`userServerSettings:${userId}:${serverId}`, () =>
				getUserServerSettingsForServerByDiscordId(ctx, userId, serverId),
			),

		getDiscordAccountIdFromAuth: () =>
			cache.get("discordAccountId", () => getDiscordAccountIdFromAuth(ctx)),

		getChannel: (channelId: bigint) =>
			cache.get(`channel:${channelId}`, () =>
				getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
			),

		getServer: (serverId: bigint) =>
			cache.get(`server:${serverId}`, () =>
				getOneFrom(ctx.db, "servers", "by_discordId", serverId, "discordId"),
			),

		isChannelIndexingEnabled: (channelId: bigint, parentChannelId?: bigint) =>
			cache.get(
				`channelIndexing:${channelId}:${parentChannelId ?? "none"}`,
				() =>
					isChannelIndexingEnabled(ctx, {
						id: channelId,
						parentId: parentChannelId,
					}),
			),
	};
}

async function fetchMessagePrivacyData(
	cache: DataAccessCache,
	message: Message,
): Promise<{
	serverPreferences: ServerPreferences | null;
	authorServerSettings: UserServerSettings | null;
}> {
	const [serverPreferences, authorServerSettings] = await Promise.all([
		cache.getServerPreferences(message.serverId),
		cache.getUserServerSettings(message.authorId, message.serverId),
	]);

	return {
		serverPreferences: serverPreferences ?? null,
		authorServerSettings,
	};
}

export async function enrichMessage(
	ctx: QueryCtx,
	cache: DataAccessCache,
	message: Message,
): Promise<SharedEnrichedMessage | null> {
	const [privacyData, userServerSettings] = await Promise.all([
		fetchMessagePrivacyData(cache, message),
		cache
			.getDiscordAccountIdFromAuth()
			.then((id) =>
				id ? cache.getUserServerSettings(id, message.serverId) : null,
			),
	]);

	const { serverPreferences, authorServerSettings } = privacyData;

	const isPublic = isMessagePublic(
		serverPreferences,
		authorServerSettings,
		message.serverId,
	);
	const isAnonymous = shouldAnonymizeMessage(
		serverPreferences,
		authorServerSettings,
		message.serverId,
	);

	const messageWithPrivacy: MessageWithPrivacyFlags = {
		...message,
		public: isPublic,
		isAnonymous,
	};

	if (!messageWithPrivacy.public && !userServerSettings) {
		return null;
	}

	return await enrichMessageForDisplay(ctx, message, { isAnonymous });
}

type DataAccessCache = ReturnType<typeof createDataAccessCache>;

export async function enrichMessages(
	ctx: QueryCtx,
	messages: Message[],
): Promise<SharedEnrichedMessage[]> {
	const cache = createDataAccessCache(ctx);
	const results = await Promise.all(
		messages.map((message) => enrichMessage(ctx, cache, message)),
	);
	return Arr.filter(results, Predicate.isNotNullable);
}

async function enrichedMessageWithServerAndChannelsInternal(
	ctx: QueryCtx,
	cache: DataAccessCache,
	message: Message,
) {
	const { parentChannelId } = message;

	const indexingEnabled = await cache.isChannelIndexingEnabled(
		message.channelId,
		parentChannelId ?? undefined,
	);
	if (!indexingEnabled) return null;

	const [enrichedMessage, parentChannel, channel, server] = await Promise.all([
		enrichMessage(ctx, cache, message),
		parentChannelId ? cache.getChannel(parentChannelId) : undefined,
		cache.getChannel(message.channelId),
		cache.getServer(message.serverId),
	]);

	if (!channel || !server || server.kickedTime || !enrichedMessage) return null;

	return {
		channel: parentChannel ?? channel,
		message: enrichedMessage,
		server,
		thread: parentChannel ? channel : null,
	} satisfies SearchResult;
}

export async function enrichMessagesWithServerAndChannels(
	ctx: QueryCtx,
	messages: Message[],
): Promise<SearchResult[]> {
	const cache = createDataAccessCache(ctx);
	return Arr.filter(
		await Promise.all(
			messages.map((m) =>
				enrichedMessageWithServerAndChannelsInternal(ctx, cache, m),
			),
		),
		Predicate.isNotNullable,
	);
}

export type SearchResult = {
	message: SharedEnrichedMessage;
	channel: Doc<"channels">;
	server: Doc<"servers">;
	thread?: Doc<"channels"> | null;
};

export async function searchMessages(
	ctx: QueryCtx,
	args: {
		query: string;
		serverId?: bigint;
		channelId?: bigint;
		paginationOpts: { numItems: number; cursor: string | null };
	},
): Promise<{
	page: SearchResult[];
	isDone: boolean;
	continueCursor: string;
}> {
	const paginatedResult = await ctx.db
		.query("messages")
		.withSearchIndex("search_content", (q) => {
			const searchQuery = q.search("content", args.query);
			if (args.channelId) {
				return searchQuery.eq("channelId", args.channelId);
			}
			if (args.serverId) {
				return searchQuery.eq("serverId", args.serverId);
			}
			return searchQuery;
		})
		.paginate(args.paginationOpts);

	const cache = createDataAccessCache(ctx);
	const allResults = Arr.filter(
		await Promise.all(
			paginatedResult.page.map((m) =>
				enrichedMessageWithServerAndChannelsInternal(ctx, cache, m),
			),
		),
		Predicate.isNotNullable,
	);

	const results = args.channelId
		? Arr.filter(
				allResults,
				(r) =>
					r.channel.id === args.channelId ||
					r.channel.parentId === args.channelId,
			)
		: allResults;

	return {
		page: results,
		isDone: paginatedResult.isDone,
		continueCursor: paginatedResult.continueCursor,
	};
}
