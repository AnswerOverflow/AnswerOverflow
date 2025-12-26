import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../client";
import type { ServerPreferences, UserServerSettings } from "../schema";

type Message = Doc<"messages">;
type BaseCtx = QueryCtx | MutationCtx;

import {
	getDiscordAccountIdFromAuth,
	getUserServerSettingsForServerByDiscordId,
} from "./auth";
import { getChannelWithSettings, isChannelIndexingEnabled } from "./channels";
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

		getChannelWithSettings: (channelId: bigint) =>
			cache.get(`channelWithSettings:${channelId}`, () =>
				getChannelWithSettings(ctx, channelId),
			),

		getChannelSettings: (channelId: bigint) =>
			cache.get(`channelSettings:${channelId}`, () =>
				getOneFrom(ctx.db, "channelSettings", "by_channelId", channelId),
			),

		getServer: (serverId: bigint) =>
			cache.get(`server:${serverId}`, () =>
				getOneFrom(ctx.db, "servers", "by_discordId", serverId, "discordId"),
			),

		getDiscordAccount: (accountId: bigint) =>
			cache.get(`discordAccount:${accountId}`, () =>
				getOneFrom(
					ctx.db,
					"discordAccounts",
					"by_discordAccountId",
					accountId,
					"id",
				),
			),

		getMessage: (messageId: bigint) =>
			cache.get(`message:${messageId}`, () =>
				getOneFrom(ctx.db, "messages", "by_messageId", messageId, "id"),
			),

		getAttachmentsByMessageId: (messageId: bigint) =>
			cache.get(`attachments:${messageId}`, () =>
				getManyFrom(
					ctx.db,
					"attachments",
					"by_messageId",
					messageId,
					"messageId",
				),
			),

		getReactionsByMessageId: (messageId: bigint) =>
			cache.get(`reactions:${messageId}`, () =>
				getManyFrom(
					ctx.db,
					"reactions",
					"by_messageId",
					messageId,
					"messageId",
				),
			),

		getSolutionsByQuestionId: (questionId: bigint) =>
			cache.get(`solutions:${questionId}`, () =>
				getManyFrom(
					ctx.db,
					"messages",
					"by_questionId",
					questionId,
					"questionId",
				),
			),

		getEmoji: (emojiId: bigint) =>
			cache.get(`emoji:${emojiId}`, () =>
				getOneFrom(ctx.db, "emojis", "by_emojiId", emojiId, "id"),
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
		getFirstMessageAfter: (args: { messageId: bigint; channelId: bigint }) =>
			cache.get(`firstMessageAfter:${args.messageId}:${args.channelId}`, () =>
				ctx.db
					.query("messages")
					.withIndex("by_channelId_and_id", (q) =>
						q.eq("channelId", args.channelId).gt("id", args.messageId),
					)
					.first(),
			),
	};
}

export type DataAccessCache = ReturnType<typeof createDataAccessCache>;

export type QueryCtxWithCache = BaseCtx & { cache: DataAccessCache };

async function fetchMessagePrivacyData(
	ctx: QueryCtxWithCache,
	message: Message,
): Promise<{
	serverPreferences: ServerPreferences | null;
	authorServerSettings: UserServerSettings | null;
}> {
	const [serverPreferences, authorServerSettings] = await Promise.all([
		ctx.cache.getServerPreferences(message.serverId),
		ctx.cache.getUserServerSettings(message.authorId, message.serverId),
	]);

	return {
		serverPreferences: serverPreferences ?? null,
		authorServerSettings,
	};
}

export async function enrichMessage(
	ctx: QueryCtxWithCache,
	message: Message,
): Promise<SharedEnrichedMessage | null> {
	const [privacyData, userServerSettings] = await Promise.all([
		fetchMessagePrivacyData(ctx, message),
		ctx.cache
			.getDiscordAccountIdFromAuth()
			.then((id) =>
				id ? ctx.cache.getUserServerSettings(id, message.serverId) : null,
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

export async function enrichMessages(
	ctx: QueryCtxWithCache,
	messages: Message[],
): Promise<SharedEnrichedMessage[]> {
	const results = await Promise.all(
		messages.map((message) => enrichMessage(ctx, message)),
	);
	return Arr.filter(results, Predicate.isNotNullable);
}

async function enrichedMessageWithServerAndChannelsInternal(
	ctx: QueryCtxWithCache,
	message: Message,
) {
	const { parentChannelId, childThreadId } = message;

	const indexingEnabled = await ctx.cache.isChannelIndexingEnabled(
		message.channelId,
		parentChannelId ?? undefined,
	);
	if (!indexingEnabled) return null;

	const [enrichedMessage, parentChannel, channel, childThread, server] =
		await Promise.all([
			enrichMessage(ctx, message),
			parentChannelId ? ctx.cache.getChannel(parentChannelId) : undefined,
			ctx.cache.getChannel(message.channelId),
			childThreadId ? ctx.cache.getChannel(childThreadId) : undefined,
			ctx.cache.getServer(message.serverId),
		]);

	if (!channel || !server || server.kickedTime || !enrichedMessage) return null;

	const thread = parentChannelId ? channel : (childThread ?? null);

	return {
		channel: parentChannel ?? channel,
		message: enrichedMessage,
		server,
		thread,
	} satisfies SearchResult;
}

export async function enrichMessagesWithServerAndChannels(
	ctx: QueryCtxWithCache,
	messages: Message[],
): Promise<SearchResult[]> {
	return Arr.filter(
		await Promise.all(
			messages.map((m) => enrichedMessageWithServerAndChannelsInternal(ctx, m)),
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
	ctx: QueryCtxWithCache,
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
				return searchQuery.eq("parentChannelId", args.channelId);
			}
			if (args.serverId) {
				return searchQuery.eq("serverId", args.serverId);
			}
			return searchQuery;
		})
		.paginate(args.paginationOpts);

	const allResults = Arr.filter(
		await Promise.all(
			paginatedResult.page.map((m) =>
				enrichedMessageWithServerAndChannelsInternal(ctx, m),
			),
		),
		Predicate.isNotNullable,
	);

	return {
		page: allResults,
		isDone: paginatedResult.isDone,
		continueCursor: paginatedResult.continueCursor,
	};
}
