import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { QueryCtx } from "../client";
import type { Message, ServerPreferences, UserServerSettings } from "../schema";
import { getDiscordAccountIdFromAuth } from "./auth";
import { isChannelIndexingEnabled } from "./channels";
import {
	isMessagePublic,
	type MessageWithPrivacyFlags,
	shouldAnonymizeMessage,
} from "./messagePrivacy";
import type { PublicChannel, PublicServer } from "./publicSchemas";
import {
	enrichMessageForDisplay,
	type EnrichedMessage as SharedEnrichedMessage,
	findUserServerSettingsById,
} from "./shared";

export function hiddenMessageStub(): MessageWithPrivacyFlags {
	return {
		authorId: 0n,
		type: 0,
		parentChannelId: 0n,
		childThreadId: 0n,
		questionId: 0n,
		referenceId: 0n,
		applicationId: 0n,
		webhookId: 0n,
		channelId: 0n,
		content: "",
		id: 0n,
		isAnonymous: true,
		public: false,
		serverId: 0n,
	};
}

async function enrichSingleMessage(
	ctx: QueryCtx,
	message: Message,
): Promise<SharedEnrichedMessage | null> {
	const [viewerDiscordId, serverPreferences, authorServerSettings] =
		await Promise.all([
			getDiscordAccountIdFromAuth(ctx),
			getOneFrom(
				ctx.db,
				"serverPreferences",
				"by_serverId",
				message.serverId,
			).then((prefs) => prefs ?? null),
			findUserServerSettingsById(ctx, message.authorId, message.serverId),
		]);

	const viewerServerSettings = viewerDiscordId
		? await findUserServerSettingsById(ctx, viewerDiscordId, message.serverId)
		: null;

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

	if (!isPublic && !viewerServerSettings) {
		return null;
	}

	return await enrichMessageForDisplay(ctx, message, { isAnonymous });
}

export async function enrichMessages(
	ctx: QueryCtx,
	messages: Message[],
): Promise<SharedEnrichedMessage[]> {
	if (messages.length === 0) {
		return [];
	}

	const viewerDiscordId = await getDiscordAccountIdFromAuth(ctx);

	const uniqueServerIds = Arr.dedupe(messages.map((m) => m.serverId));
	const uniqueAuthorIds = Arr.dedupe(messages.map((m) => m.authorId));

	const [serverPrefsResults, authorSettingsResults, viewerSettingsResults] =
		await Promise.all([
			Promise.all(
				uniqueServerIds.map((serverId) =>
					getOneFrom(ctx.db, "serverPreferences", "by_serverId", serverId).then(
						(prefs) => [serverId.toString(), prefs ?? null] as const,
					),
				),
			),
			Promise.all(
				uniqueAuthorIds.flatMap((authorId) =>
					uniqueServerIds.map((serverId) =>
						findUserServerSettingsById(ctx, authorId, serverId).then(
							(settings) =>
								[
									`${authorId.toString()}_${serverId.toString()}`,
									settings,
								] as const,
						),
					),
				),
			),
			viewerDiscordId
				? Promise.all(
						uniqueServerIds.map((serverId) =>
							findUserServerSettingsById(ctx, viewerDiscordId, serverId).then(
								(settings) => [serverId.toString(), settings] as const,
							),
						),
					)
				: Promise.resolve([]),
		]);

	const serverPrefsMap = new Map<string, ServerPreferences | null>(
		serverPrefsResults,
	);
	const authorSettingsMap = new Map<string, UserServerSettings | null>(
		authorSettingsResults,
	);
	const viewerSettingsMap = new Map<string, UserServerSettings | null>(
		viewerSettingsResults,
	);

	const enrichedResults = await Promise.all(
		messages.map(async (message) => {
			const serverIdStr = message.serverId.toString();
			const authorKey = `${message.authorId.toString()}_${serverIdStr}`;

			const serverPreferences = serverPrefsMap.get(serverIdStr) ?? null;
			const authorServerSettings = authorSettingsMap.get(authorKey) ?? null;
			const viewerServerSettings = viewerSettingsMap.get(serverIdStr) ?? null;

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

			if (!isPublic && !viewerServerSettings) {
				return null;
			}

			return await enrichMessageForDisplay(ctx, message, { isAnonymous });
		}),
	);

	return Arr.filter(enrichedResults, Predicate.isNotNullable);
}

export async function enrichedMessageWithServerAndChannels(
	ctx: QueryCtx,
	message: Message,
) {
	const { parentChannelId } = message;

	const indexingEnabled = await isChannelIndexingEnabled(
		ctx,
		message.channelId,
		parentChannelId ?? undefined,
	);
	if (!indexingEnabled) return null;

	const [enrichedMessage, parentChannel, channel, server] = await Promise.all([
		enrichSingleMessage(ctx, message),
		parentChannelId
			? getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					parentChannelId,
					"id",
				)
			: undefined,
		getOneFrom(
			ctx.db,
			"channels",
			"by_discordChannelId",
			message.channelId,
			"id",
		),
		getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			message.serverId,
			"discordId",
		),
	]);

	if (!channel || !server || !enrichedMessage) return null;

	return {
		channel: parentChannel || channel,
		message: enrichedMessage,
		server: server,
		thread: parentChannel ?? null,
	} satisfies SearchResult;
}

export type SearchResult = {
	message: SharedEnrichedMessage;
	channel: PublicChannel;
	server: PublicServer;
	thread?: PublicChannel | null;
};

export async function searchMessages(
	ctx: QueryCtx,
	args: {
		query: string;
		serverId?: bigint;
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
			if (args.serverId) {
				return searchQuery.eq("serverId", args.serverId);
			}
			return searchQuery;
		})
		.paginate(args.paginationOpts);

	const results = Arr.filter(
		await Promise.all(
			paginatedResult.page.map((m) =>
				enrichedMessageWithServerAndChannels(ctx, m),
			),
		),
		Predicate.isNotNullable,
	);

	return {
		page: results,
		isDone: paginatedResult.isDone,
		continueCursor: paginatedResult.continueCursor,
	};
}
