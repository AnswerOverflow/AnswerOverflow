import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { QueryCtx } from "../client";
import type { Message, ServerPreferences, UserServerSettings } from "../schema";
import {
	getDiscordAccountIdFromAuth,
	getUserServerSettingsForServerByDiscordId,
} from "./auth";
import {
	isMessagePublic,
	type MessageWithPrivacyFlags,
	shouldAnonymizeMessage,
} from "./messagePrivacy";
import type { PublicChannel, PublicServer } from "./publicSchemas";
import {
	enrichMessageForDisplay,
	type EnrichedMessage as SharedEnrichedMessage,
} from "./shared";

async function fetchMessagePrivacyData(
	ctx: QueryCtx,
	message: Message,
): Promise<{
	serverPreferences: ServerPreferences | null;
	authorServerSettings: UserServerSettings | null;
}> {
	const [serverPreferences, authorServerSettings] = await Promise.all([
		getOneFrom(ctx.db, "serverPreferences", "by_serverId", message.serverId),
		getUserServerSettingsForServerByDiscordId(
			ctx,
			message.authorId,
			message.serverId,
		),
	]);

	return {
		serverPreferences: serverPreferences ?? null,
		authorServerSettings,
	};
}

async function enrichMessage(
	ctx: QueryCtx,
	message: Message,
): Promise<SharedEnrichedMessage | null> {
	const [privacyData, userServerSettings] = await Promise.all([
		fetchMessagePrivacyData(ctx, message),
		getDiscordAccountIdFromAuth(ctx).then((id) =>
			id
				? getUserServerSettingsForServerByDiscordId(ctx, id, message.serverId)
				: null,
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

	return await enrichMessageForDisplay(ctx, message);
}

export function hiddenMessageStub(): MessageWithPrivacyFlags {
	return {
		authorId: "",
		type: 0,
		parentChannelId: "",
		childThreadId: "",
		questionId: "",
		referenceId: "",
		applicationId: "",
		webhookId: "",
		channelId: "",
		content: "",
		id: "",
		isAnonymous: true,
		public: false,
		serverId: "",
	};
}

export async function enrichMessages(
	ctx: QueryCtx,
	messages: Message[],
): Promise<SharedEnrichedMessage[]> {
	const results = await Promise.all(
		messages.map((message) => enrichMessage(ctx, message)),
	);
	return Arr.filter(results, Predicate.isNotNullable);
}

export async function enrichedMessageWithServerAndChannels(
	ctx: QueryCtx,
	message: Message,
) {
	const { parentChannelId } = message;
	const [enrichedMessage, parentChannel, channel, server] = await Promise.all([
		enrichMessage(ctx, message),
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
		paginationOpts: { numItems: number; cursor: string | null };
	},
): Promise<{
	page: SearchResult[];
	isDone: boolean;
	continueCursor: string;
}> {
	const paginatedResult = await ctx.db
		.query("messages")
		.withSearchIndex("search_content", (q) => q.search("content", args.query))
		.paginate({
			...args.paginationOpts,
			numItems: Math.min(args.paginationOpts.numItems, 10),
		});

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
