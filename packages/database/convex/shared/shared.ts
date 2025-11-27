import type { Infer } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Id } from "../_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";
import type {
	Attachment,
	attachmentSchema,
	emojiSchema,
	messageSchema,
} from "../schema";
import { anonymizeDiscordAccount } from "./anonymization.js";

type Message = Infer<typeof messageSchema>;
export type DatabaseAttachment = Infer<typeof attachmentSchema>;
export const DISCORD_PERMISSIONS = {
	Administrator: 0x8,
	ManageGuild: 0x20,
} as const;

export function hasPermission(
	permissions: number | bigint,
	permission: number | bigint,
): boolean {
	if (typeof permissions === "bigint" || typeof permission === "bigint") {
		const permsBigInt = BigInt(permissions);
		const permBigInt = BigInt(permission);
		return (permsBigInt & permBigInt) === permBigInt;
	}
	return (permissions & permission) === permission;
}

export const CHANNEL_TYPE = {
	GuildText: 0,
	GuildAnnouncement: 5,
	GuildForum: 15,
	AnnouncementThread: 10,
	PublicThread: 11,
	PrivateThread: 12,
} as const;

export function isThreadType(type: number): boolean {
	return (
		type === CHANNEL_TYPE.AnnouncementThread ||
		type === CHANNEL_TYPE.PublicThread ||
		type === CHANNEL_TYPE.PrivateThread
	);
}

export const ROOT_CHANNEL_TYPES = [
	CHANNEL_TYPE.GuildText,
	CHANNEL_TYPE.GuildAnnouncement,
	CHANNEL_TYPE.GuildForum,
] as const;

type ServerWithMetadata = {
	hasBot: boolean;
	highestRole: "Owner" | "Administrator" | "Manage Guild";
};

export function sortServersByBotAndRole<T extends ServerWithMetadata>(
	servers: T[],
): T[] {
	return servers.sort((a, b) => {
		if (a.hasBot && !b.hasBot) return -1;
		if (!a.hasBot && b.hasBot) return 1;

		const roleOrder: Record<
			"Owner" | "Administrator" | "Manage Guild",
			number
		> = {
			Owner: 0,
			Administrator: 1,
			"Manage Guild": 2,
		};
		return roleOrder[a.highestRole] - roleOrder[b.highestRole];
	});
}

export function getHighestRoleFromPermissions(
	permissions: number | bigint,
	isOwner: boolean = false,
): "Owner" | "Administrator" | "Manage Guild" {
	if (isOwner) {
		return "Owner";
	}
	if (hasPermission(permissions, DISCORD_PERMISSIONS.Administrator)) {
		return "Administrator";
	}
	return "Manage Guild";
}

export function validateCustomDomain(domain: string | null): string | null {
	if (domain === null || domain === "") {
		return null; // Empty is valid (means no custom domain)
	}

	if (domain.toLowerCase().endsWith(".answeroverflow.com")) {
		return "Domain cannot end with .answeroverflow.com. Please use a domain that you own";
	}

	const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
	if (!domainRegex.test(domain)) {
		return "Invalid domain format";
	}

	return null;
}

export async function validateCustomDomainUniqueness(
	ctx: QueryCtx | MutationCtx,
	customDomain: string | null | undefined,
	excludeServerId?: bigint,
	excludePreferencesId?: Id<"serverPreferences">,
): Promise<string | null> {
	if (!customDomain) {
		return null;
	}

	const allServers = await ctx.db.query("servers").collect();
	for (const server of allServers) {
		if (excludeServerId && server.discordId === excludeServerId) {
			continue;
		}

		if (server.preferencesId) {
			const prefs = await ctx.db.get(server.preferencesId);
			if (
				prefs?.customDomain === customDomain &&
				(!excludePreferencesId || prefs._id !== excludePreferencesId)
			) {
				return `Server with custom domain ${customDomain} already exists`;
			}
		}
	}

	return null;
}

export async function getServerByDiscordId(
	ctx: QueryCtx | MutationCtx,
	discordId: bigint,
) {
	return await ctx.db
		.query("servers")
		.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
		.first();
}

export async function findIgnoredDiscordAccountById(
	ctx: QueryCtx | MutationCtx,
	id: bigint,
) {
	return await ctx.db
		.query("ignoredDiscordAccounts")
		.filter((q) => q.eq(q.field("id"), id))
		.first();
}

export async function upsertIgnoredDiscordAccountInternalLogic(
	ctx: MutationCtx,
	id: bigint,
) {
	const existingIgnored = await ctx.db
		.query("ignoredDiscordAccounts")
		.filter((q) => q.eq(q.field("id"), id))
		.first();

	if (existingIgnored) {
		return existingIgnored;
	}

	await ctx.db.insert("ignoredDiscordAccounts", { id });

	const upserted = await ctx.db
		.query("ignoredDiscordAccounts")
		.filter((q) => q.eq(q.field("id"), id))
		.first();

	if (!upserted) {
		throw new Error("Failed to upsert account");
	}

	return upserted;
}

export async function findUserServerSettingsById(
	ctx: QueryCtx | MutationCtx,
	userId: bigint,
	serverId: bigint,
) {
	const settings = await ctx.db
		.query("userServerSettings")
		.withIndex("by_userId_serverId", (q) =>
			q.eq("userId", userId).eq("serverId", serverId),
		)
		.first();
	return settings ?? null;
}

export async function deleteUserServerSettingsByUserIdLogic(
	ctx: MutationCtx,
	userId: bigint,
): Promise<void> {
	const settings = await ctx.db
		.query("userServerSettings")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.collect();

	for (const setting of settings) {
		await ctx.db.delete(setting._id);
	}
}

const DEFAULT_CHANNEL_SETTINGS = {
	channelId: 0n,
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

export async function getChannelWithSettings(
	ctx: QueryCtx | MutationCtx,
	channelId: bigint,
) {
	const channel = await ctx.db
		.query("channels")
		.withIndex("by_discordChannelId", (q) => q.eq("id", channelId))
		.first();

	if (!channel) {
		return null;
	}

	const settings = await getOneFrom(
		ctx.db,
		"channelSettings",
		"by_channelId",
		channelId,
	);

	return {
		...channel,
		flags: settings ?? { ...DEFAULT_CHANNEL_SETTINGS, channelId },
	};
}

export async function deleteChannelInternalLogic(
	ctx: MutationCtx,
	id: bigint,
): Promise<void> {
	const threads = await ctx.db
		.query("channels")
		.withIndex("by_parentId", (q) => q.eq("parentId", id))
		.collect();

	for (const thread of threads) {
		await deleteChannelInternalLogic(ctx, thread.id);
	}

	const settings = await ctx.db
		.query("channelSettings")
		.withIndex("by_channelId", (q) => q.eq("channelId", id))
		.collect();

	for (const setting of settings) {
		await ctx.db.delete(setting._id);
	}

	const channel = await ctx.db
		.query("channels")
		.filter((q) => q.eq(q.field("id"), id))
		.first();

	if (channel) {
		await ctx.db.delete(channel._id);
	}
}

export async function getDiscordAccountById(
	ctx: QueryCtx | MutationCtx,
	id: bigint,
) {
	return await ctx.db
		.query("discordAccounts")
		.filter((q) => q.eq(q.field("id"), id))
		.first();
}

export function extractMentionIds(content: string): {
	userIds: bigint[];
	channelIds: bigint[];
} {
	const userIds = new Set<bigint>();
	const channelIds = new Set<bigint>();

	const userMentionRegex = /<@(\d+)>/g;
	const channelMentionRegex = /<#(\d+)>/g;

	for (const match of content.matchAll(userMentionRegex)) {
		if (match[1]) {
			userIds.add(BigInt(match[1]));
		}
	}

	for (const match of content.matchAll(channelMentionRegex)) {
		if (match[1]) {
			channelIds.add(BigInt(match[1]));
		}
	}

	return {
		userIds: Array.from(userIds),
		channelIds: Array.from(channelIds),
	};
}

export function extractDiscordLinks(content: string): Array<{
	original: string;
	guildId: bigint;
	channelId: bigint;
	messageId?: bigint;
}> {
	const discordLinkRegex =
		/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)(?:\/(\d+))?/g;

	const matches = content.matchAll(discordLinkRegex);
	return Arr.map(Array.from(matches), (match) => {
		const guildId = match[1];
		const channelId = match[2];
		const messageId = match[3];
		if (!guildId || !channelId) {
			return undefined;
		}
		return {
			original: match[0],
			guildId: BigInt(guildId),
			channelId: BigInt(channelId),
			messageId: messageId ? BigInt(messageId) : undefined,
		};
	}).filter(Predicate.isNotNullable);
}

export async function getMentionMetadata(
	ctx: QueryCtx | MutationCtx,
	userIds: bigint[],
	channelIds: bigint[],
	serverDiscordId: bigint,
) {
	const users: Record<
		string,
		{
			username: string;
			globalName: string | null;
			url: string;
			exists?: boolean;
		}
	> = {};
	const channels: Record<
		string,
		{
			name: string;
			type: number;
			url: string;
			indexingEnabled?: boolean;
			exists?: boolean;
		}
	> = {};

	for (const userId of userIds) {
		const account = await getDiscordAccountById(ctx, userId);
		const userIdStr = userId.toString();
		if (account) {
			users[userIdStr] = {
				username: account.name,
				globalName: null,
				url: `/u/${userId}`,
				exists: true,
			};
		} else {
			users[userIdStr] = {
				username: "Unknown user",
				globalName: null,
				url: "",
				exists: false,
			};
		}
	}

	for (const channelId of channelIds) {
		const [channel, settings] = await Promise.all([
			getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
			getOneFrom(ctx.db, "channelSettings", "by_channelId", channelId),
		]);

		const channelIdStr = channelId.toString();
		if (channel) {
			const indexingEnabled = settings?.indexingEnabled ?? false;
			channels[channelIdStr] = {
				name: channel.name,
				type: channel.type,
				url: indexingEnabled
					? `/c/${serverDiscordId}/${channelId}`
					: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
				indexingEnabled,
				exists: true,
			};
		} else {
			channels[channelIdStr] = {
				name: "Unknown Channel",
				type: 0,
				url: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
				indexingEnabled: false,
				exists: false,
			};
		}
	}

	return { users, channels };
}

export async function getInternalLinksMetadata(
	ctx: QueryCtx | MutationCtx,
	discordLinks: Array<{
		original: string;
		guildId: bigint;
		channelId: bigint;
		messageId?: bigint;
	}>,
) {
	if (discordLinks.length === 0) {
		return [];
	}

	const results = await Promise.all(
		discordLinks.map(async (link) => {
			const [server, channel] = await Promise.all([
				getOneFrom(ctx.db, "servers", "by_discordId", link.guildId),
				getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					link.channelId,
					"id",
				),
			]);

			if (!server || !channel) {
				return undefined;
			}

			if (link.messageId) {
				const message = await getMessageById(ctx, link.messageId);
				if (!message) {
					return undefined;
				}
			}

			const parentChannel = channel.parentId
				? await getOneFrom(
						ctx.db,
						"channels",
						"by_discordChannelId",
						channel.parentId,
						"id",
					)
				: undefined;

			return {
				original: link.original,
				guild: { id: server.discordId, name: server.name },
				channel: {
					id: channel.id,
					type: channel.type,
					name: channel.name,
					parent: parentChannel
						? {
								name: parentChannel.name,
								type: parentChannel.type,
								parentId: parentChannel.id,
							}
						: undefined,
				},
				message: link.messageId,
			};
		}),
	);

	return Arr.filter(results, Predicate.isNotNullable);
}

export async function getMessageById(ctx: QueryCtx | MutationCtx, id: bigint) {
	return await ctx.db
		.query("messages")
		.filter((q) => q.eq(q.field("id"), id))
		.first();
}

export function compareIds(a: bigint, b: bigint): number {
	return a > b ? 1 : a < b ? -1 : 0;
}

export async function findMessagesByChannelId(
	ctx: QueryCtx | MutationCtx,
	channelId: bigint,
	limit?: number,
	after?: bigint,
) {
	const allMessages = await getManyFrom(
		ctx.db,
		"messages",
		"by_channelId",
		channelId,
		"channelId",
	);

	let messages = allMessages.sort((a, b) => compareIds(a.id, b.id));

	if (after) {
		messages = messages.filter((msg) => compareIds(msg.id, after) > 0);
	}

	const effectiveLimit = limit ?? 100;
	return messages.slice(0, effectiveLimit);
}

export async function getFirstMessageInChannel(
	ctx: QueryCtx | MutationCtx,
	channelId: bigint,
): Promise<Message | null> {
	const allMessages = await getManyFrom(
		ctx.db,
		"messages",
		"by_channelId",
		channelId,
		"channelId",
	);

	if (allMessages.length === 0) {
		return null;
	}

	return allMessages.sort((a, b) => compareIds(a.id, b.id))[0] ?? null;
}

export async function getFirstMessagesInChannels(
	ctx: QueryCtx | MutationCtx,
	channelIds: bigint[],
): Promise<Record<string, Message | null>> {
	const results: Record<string, Message | null> = {};
	for (const channelId of channelIds) {
		results[channelId.toString()] = null;
	}

	if (channelIds.length === 0) {
		return results;
	}

	const channelMessages = await Promise.all(
		channelIds.map(async (channelId) => {
			const messages = await getManyFrom(
				ctx.db,
				"messages",
				"by_channelId",
				channelId,
				"channelId",
			);
			return {
				channelId,
				firstMessage:
					messages.length === 0
						? null
						: (messages.sort((a, b) => compareIds(a.id, b.id))[0] ?? null),
			};
		}),
	);

	for (const { channelId, firstMessage } of channelMessages) {
		results[channelId.toString()] = firstMessage;
	}

	return results;
}

export async function findAttachmentsByMessageId(
	ctx: QueryCtx | MutationCtx,
	messageId: bigint,
) {
	return await getManyFrom(
		ctx.db,
		"attachments",
		"by_messageId",
		messageId,
		"messageId",
	);
}

export async function findReactionsByMessageId(
	ctx: QueryCtx | MutationCtx,
	messageId: bigint,
) {
	return await getManyFrom(
		ctx.db,
		"reactions",
		"by_messageId",
		messageId,
		"messageId",
	);
}

export async function findMessagesByAuthorId(
	ctx: QueryCtx | MutationCtx,
	authorId: bigint,
	limit?: number,
) {
	const messages = await getManyFrom(
		ctx.db,
		"messages",
		"by_authorId",
		authorId,
		"authorId",
	);
	return messages.slice(0, limit ?? 100);
}

export async function findSolutionsByQuestionId(
	ctx: QueryCtx | MutationCtx,
	questionId: bigint,
	limit?: number,
) {
	const messages = await getManyFrom(
		ctx.db,
		"messages",
		"by_questionId",
		questionId,
		"questionId",
	);
	return messages.slice(0, limit ?? 100);
}

export async function deleteMessageInternalLogic(
	ctx: MutationCtx,
	id: bigint,
): Promise<void> {
	const attachments = await getManyFrom(
		ctx.db,
		"attachments",
		"by_messageId",
		id,
		"messageId",
	);

	for (const attachment of attachments) {
		await ctx.db.delete(attachment._id);
	}

	const reactions = await getManyFrom(
		ctx.db,
		"reactions",
		"by_messageId",
		id,
		"messageId",
	);

	for (const reaction of reactions) {
		await ctx.db.delete(reaction._id);
	}

	const message = await ctx.db
		.query("messages")
		.filter((q) => q.eq(q.field("id"), id))
		.first();

	if (message) {
		await ctx.db.delete(message._id);
	}
}

export async function upsertMessageInternalLogic(
	ctx: MutationCtx,
	args: {
		message: Message;
		attachments?: DatabaseAttachment[];
		reactions?: Array<{
			userId: bigint;
			emoji: Infer<typeof emojiSchema>;
		}>;
	},
): Promise<void> {
	const { attachments, reactions } = args;
	const messageData = args.message;

	const existing = await ctx.db
		.query("messages")
		.withIndex("by_messageId", (q) => q.eq("id", messageData.id))
		.first();

	if (existing) {
		await ctx.db.replace(existing._id, messageData);
	} else {
		await ctx.db.insert("messages", messageData);
	}

	if (attachments !== undefined) {
		const existingAttachments = await ctx.db
			.query("attachments")
			.withIndex("by_messageId", (q) => q.eq("messageId", messageData.id))
			.collect();

		for (const attachment of existingAttachments) {
			await ctx.db.delete(attachment._id);
		}

		if (attachments.length > 0) {
			for (const attachment of attachments) {
				await ctx.db.insert("attachments", attachment);
			}
		}
	}

	if (reactions !== undefined) {
		const existingReactions = await ctx.db
			.query("reactions")
			.withIndex("by_messageId", (q) => q.eq("messageId", messageData.id))
			.collect();

		for (const reaction of existingReactions) {
			await ctx.db.delete(reaction._id);
		}

		const reactionsWithEmojiId = reactions.filter((r) => r.emoji.id);
		if (reactionsWithEmojiId.length > 0) {
			const emojiIds = new Set(
				reactionsWithEmojiId
					.map((r) => r.emoji.id)
					.filter((id): id is bigint => !!id),
			);

			for (const emojiId of emojiIds) {
				const existingEmoji = await ctx.db
					.query("emojis")
					.filter((q) => q.eq(q.field("id"), emojiId))
					.first();

				if (!existingEmoji) {
					const reaction = reactionsWithEmojiId.find(
						(r) => r.emoji.id === emojiId,
					);
					if (reaction) {
						await ctx.db.insert("emojis", reaction.emoji);
					}
				}
			}

			for (const reaction of reactionsWithEmojiId) {
				if (!reaction.emoji.id) continue;
				await ctx.db.insert("reactions", {
					messageId: messageData.id,
					userId: reaction.userId,
					emojiId: reaction.emoji.id,
				});
			}
		}
	}
}

export async function uploadAttachmentFromUrlLogic(
	ctx: ActionCtx,
	args: {
		url: string;
		filename: string;
		contentType?: string;
	},
): Promise<Id<"_storage"> | null> {
	try {
		const response = await fetch(args.url);

		if (!response.ok) {
			console.error(
				`Failed to download attachment from ${args.url}: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		const blob = await response.blob();

		const storageId = await ctx.storage.store(blob);

		return storageId;
	} catch (error) {
		console.error(`Error uploading attachment from ${args.url}:`, error);
		return null;
	}
}

export type EnrichedMessage = {
	message: Message;
	author: {
		id: bigint;
		name: string;
		avatar?: string;
	} | null;
	attachments: Attachment[];
	reactions: Array<{
		userId: bigint;
		emoji: {
			id: bigint;
			name: string;
			animated?: boolean;
		};
	}>;
	solutions: Message[];
	metadata?: {
		users?: Record<
			string,
			{
				username: string;
				globalName: string | null;
				url: string;
				exists?: boolean;
			}
		>;
		channels?: Record<
			string,
			{
				name: string;
				type: number;
				url: string;
				indexingEnabled?: boolean;
				exists?: boolean;
			}
		>;
		internalLinks?: Array<{
			original: string;
			guild: { id: bigint; name: string };
			channel: {
				parent?: { name?: string; type?: number; parentId?: bigint };
				id: bigint;
				type: number;
				name: string;
			};
			message?: bigint;
		}>;
	};
};

export async function enrichMessagesWithData(
	ctx: QueryCtx | MutationCtx,
	messages: Message[],
): Promise<EnrichedMessage[]> {
	if (messages.length === 0) {
		return [];
	}

	const messagesWithData = await Promise.all(
		messages.map(async (message) => {
			return await enrichMessageForDisplay(ctx, message);
		}),
	);

	return messagesWithData;
}

export async function enrichMessageForDisplay(
	ctx: QueryCtx | MutationCtx,
	message: Message,
	options?: { isAnonymous?: boolean },
): Promise<EnrichedMessage> {
	const [author, server, attachments, reactions, solutions] = await Promise.all(
		[
			getDiscordAccountById(ctx, message.authorId),
			getServerByDiscordId(ctx, message.serverId),
			findAttachmentsByMessageId(ctx, message.id),
			findReactionsByMessageId(ctx, message.id),
			message.questionId
				? findSolutionsByQuestionId(ctx, message.questionId)
				: [],
		],
	);

	const emojiIds = new Set(
		reactions.map((r) => r.emojiId).filter((id): id is bigint => !!id),
	);

	const emojiMap = new Map<
		string,
		{ id: bigint; name: string; animated?: boolean }
	>();
	for (const emojiId of emojiIds) {
		const emoji = await ctx.db
			.query("emojis")
			.filter((q) => q.eq(q.field("id"), emojiId))
			.first();
		if (emoji) {
			emojiMap.set(emojiId.toString(), {
				id: emoji.id,
				name: emoji.name,
				animated: emoji.animated,
			});
		}
	}

	const formattedReactions = reactions.map((reaction) => {
		const emoji = emojiMap.get(reaction.emojiId.toString());
		return {
			userId: reaction.userId,
			emoji: emoji ?? {
				id: reaction.emojiId,
				name: "",
			},
		};
	});

	const cdnDomain = process.env.CDN_DOMAIN ?? "cdn.answeroverflow.com";

	const attachmentsWithUrl = await Promise.all(
		attachments.map(async (attachment) => {
			if (attachment.storageId) {
				const url = await ctx.storage.getUrl(attachment.storageId);
				if (!url) {
					return null;
				}
				return {
					...attachment,
					url,
				};
			}
			return {
				...attachment,
				url: `https://${cdnDomain}/${attachment.id}/${attachment.filename}`,
			};
		}),
	);

	let authorData: { id: bigint; name: string; avatar?: string } | null = null;
	if (author) {
		if (options?.isAnonymous) {
			const anonymized = anonymizeDiscordAccount(message.authorId);
			authorData = {
				id: BigInt(anonymized.id),
				name: anonymized.name,
				avatar: anonymized.avatar ?? undefined,
			};
		} else {
			authorData = {
				id: author.id,
				name: author.name,
				avatar: author.avatar,
			};
		}
	}

	const baseEnriched: EnrichedMessage = {
		message,
		author: authorData,
		attachments: attachmentsWithUrl.filter(Predicate.isNotNullable),
		reactions: formattedReactions,
		solutions,
	};

	if (!server) {
		return baseEnriched;
	}

	const serverDiscordId = server.discordId;
	const { userIds, channelIds } = extractMentionIds(message.content);
	const messageDiscordLinks = extractDiscordLinks(message.content);

	const mentionMetadata = await getMentionMetadata(
		ctx,
		userIds,
		channelIds,
		serverDiscordId,
	);

	const messageUsers: Record<
		string,
		{
			username: string;
			globalName: string | null;
			url: string;
			exists?: boolean;
		}
	> = {};
	for (const userId of userIds) {
		const userIdStr = userId.toString();
		const user = mentionMetadata.users[userIdStr];
		if (user) {
			messageUsers[userIdStr] = user;
		}
	}

	const messageChannels = Object.fromEntries(
		channelIds.map((id) => {
			const idStr = id.toString();
			return [
				idStr,
				mentionMetadata.channels[idStr] ?? {
					name: "Unknown Channel",
					type: 0,
					url: `https://discord.com/channels/${serverDiscordId}/${id}`,
					indexingEnabled: false,
					exists: false,
				},
			];
		}),
	);

	const messageInternalLinks = await getInternalLinksMetadata(
		ctx,
		messageDiscordLinks,
	);

	return {
		...baseEnriched,
		metadata: {
			users: Object.keys(messageUsers).length > 0 ? messageUsers : undefined,
			channels:
				Object.keys(messageChannels).length > 0 ? messageChannels : undefined,
			internalLinks:
				messageInternalLinks.length > 0 ? messageInternalLinks : undefined,
		},
	};
}
