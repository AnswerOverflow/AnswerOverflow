import type { Infer } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import type {
	attachmentSchema,
	emojiSchema,
	messageSchema,
	reactionSchema,
} from "./schema";

type Message = Infer<typeof messageSchema>;
type Attachment = Infer<typeof attachmentSchema>;
type Reaction = Infer<typeof reactionSchema>;

// ============================================================================
// Discord Permissions
// ============================================================================

/**
 * Discord permission flags from Discord API
 * These can be used with both number and bigint permission values
 */
export const DISCORD_PERMISSIONS = {
	Administrator: 0x8,
	ManageGuild: 0x20,
} as const;

/**
 * Check if permissions include a specific permission flag
 * Works with both number and bigint permission values
 */
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

// ============================================================================
// Discord Channel Types
// ============================================================================

/**
 * Channel types from Discord API
 */
export const CHANNEL_TYPE = {
	GuildText: 0,
	GuildAnnouncement: 5,
	GuildForum: 15,
	AnnouncementThread: 10,
	PublicThread: 11,
	PrivateThread: 12,
} as const;

/**
 * Check if a channel type is a thread
 */
export function isThreadType(type: number): boolean {
	return (
		type === CHANNEL_TYPE.AnnouncementThread ||
		type === CHANNEL_TYPE.PublicThread ||
		type === CHANNEL_TYPE.PrivateThread
	);
}

/**
 * Root channel types (forums, text, announcements) - excludes threads
 */
export const ROOT_CHANNEL_TYPES = [
	CHANNEL_TYPE.GuildText,
	CHANNEL_TYPE.GuildAnnouncement,
	CHANNEL_TYPE.GuildForum,
] as const;

// ============================================================================
// Server Sorting
// ============================================================================

type ServerWithMetadata = {
	hasBot: boolean;
	highestRole: "Owner" | "Administrator" | "Manage Guild";
};

/**
 * Sort servers: has bot + owner/admin/manage, then no bot + owner/admin/manage
 */
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

/**
 * Determine highest role from permissions
 */
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

// ============================================================================
// Validation Utilities
// ============================================================================

/**
 * Validate custom domain format
 * Returns error message if invalid, null if valid
 */
export function validateCustomDomain(domain: string | null): string | null {
	if (domain === null || domain === "") {
		return null; // Empty is valid (means no custom domain)
	}

	// Basic domain validation - must not end with .answeroverflow.com
	if (domain.toLowerCase().endsWith(".answeroverflow.com")) {
		return "Domain cannot end with .answeroverflow.com. Please use a domain that you own";
	}

	// Basic domain format validation
	const domainRegex = /^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/i;
	if (!domainRegex.test(domain)) {
		return "Invalid domain format";
	}

	return null;
}

/**
 * Check if a custom domain is already in use by another server
 * Returns error message if in use, null if available
 */
export async function validateCustomDomainUniqueness(
	ctx: QueryCtx | MutationCtx,
	customDomain: string | null | undefined,
	excludeServerId?: Id<"servers">,
	excludePreferencesId?: Id<"serverPreferences">,
): Promise<string | null> {
	if (!customDomain) {
		return null; // Empty is valid
	}

	const allServers = await ctx.db.query("servers").collect();
	for (const server of allServers) {
		// Skip the server we're updating if provided
		if (excludeServerId && server._id === excludeServerId) {
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

// ============================================================================
// Servers
// ============================================================================

export async function getServerByDiscordId(
	ctx: QueryCtx | MutationCtx,
	discordId: string,
) {
	return await ctx.db
		.query("servers")
		.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
		.first();
}

// ============================================================================
// Ignored Discord Accounts
// ============================================================================

export async function findIgnoredDiscordAccountById(
	ctx: QueryCtx | MutationCtx,
	id: string,
) {
	return await ctx.db
		.query("ignoredDiscordAccounts")
		.filter((q) => q.eq(q.field("id"), id))
		.first();
}

export async function upsertIgnoredDiscordAccountInternalLogic(
	ctx: MutationCtx,
	id: string,
) {
	// Upsert ignored account (no check for existing account in internal version)
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

// ============================================================================
// User Server Settings
// ============================================================================

export async function findUserServerSettingsById(
	ctx: QueryCtx | MutationCtx,
	userId: string,
	serverId: Id<"servers">,
) {
	const settings = await ctx.db
		.query("userServerSettings")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.filter((q) => q.eq(q.field("serverId"), serverId))
		.first();

	return settings ?? null;
}

export async function deleteUserServerSettingsByUserIdLogic(
	ctx: MutationCtx,
	userId: string,
): Promise<void> {
	const settings = await ctx.db
		.query("userServerSettings")
		.withIndex("by_userId", (q) => q.eq("userId", userId))
		.collect();

	for (const setting of settings) {
		await ctx.db.delete(setting._id);
	}
}

// ============================================================================
// Channels
// ============================================================================

const DEFAULT_CHANNEL_SETTINGS = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

export async function getChannelWithSettings(
	ctx: QueryCtx | MutationCtx,
	channelId: string,
) {
	const channel = await ctx.db
		.query("channels")
		.filter((q) => q.eq(q.field("id"), channelId))
		.first();

	if (!channel) {
		return null;
	}

	const settings = await ctx.db
		.query("channelSettings")
		.withIndex("by_channelId", (q) => q.eq("channelId", channelId))
		.first();

	return {
		...channel,
		flags: settings ?? { ...DEFAULT_CHANNEL_SETTINGS, channelId },
	};
}

export async function deleteChannelInternalLogic(
	ctx: MutationCtx,
	id: string,
): Promise<void> {
	// Delete all threads first
	const threads = await ctx.db
		.query("channels")
		.filter((q) => q.eq(q.field("parentId"), id))
		.collect();

	for (const thread of threads) {
		// Recursively delete threads
		await deleteChannelInternalLogic(ctx, thread.id);
	}

	// Delete channel settings
	const settings = await ctx.db
		.query("channelSettings")
		.withIndex("by_channelId", (q) => q.eq("channelId", id))
		.collect();

	for (const setting of settings) {
		await ctx.db.delete(setting._id);
	}

	// Delete the channel itself
	const channel = await ctx.db
		.query("channels")
		.filter((q) => q.eq(q.field("id"), id))
		.first();

	if (channel) {
		await ctx.db.delete(channel._id);
	}

	// TODO: Delete messages when messages table exists
	// await deleteManyMessagesByChannelId(id);
}

// ============================================================================
// Discord Accounts
// ============================================================================

export async function getDiscordAccountById(
	ctx: QueryCtx | MutationCtx,
	id: string,
) {
	return await ctx.db
		.query("discordAccounts")
		.filter((q) => q.eq(q.field("id"), id))
		.first();
}

// ============================================================================
// Messages
// ============================================================================

export async function getMessageById(ctx: QueryCtx | MutationCtx, id: string) {
	return await ctx.db
		.query("messages")
		.filter((q) => q.eq(q.field("id"), id))
		.first();
}

export async function findMessagesByChannelId(
	ctx: QueryCtx | MutationCtx,
	channelId: string,
	limit?: number,
	after?: string,
) {
	let query = ctx.db
		.query("messages")
		.withIndex("by_channelId", (q) => q.eq("channelId", channelId));

	if (after) {
		query = query.filter((q) => q.gt(q.field("id"), after));
	}

	const messages = await query.collect();
	return messages.slice(0, limit ?? 100);
}

export async function findAttachmentsByMessageId(
	ctx: QueryCtx | MutationCtx,
	messageId: string,
) {
	return await ctx.db
		.query("attachments")
		.withIndex("by_messageId", (q) => q.eq("messageId", messageId))
		.collect();
}

export async function findReactionsByMessageId(
	ctx: QueryCtx | MutationCtx,
	messageId: string,
) {
	return await ctx.db
		.query("reactions")
		.withIndex("by_messageId", (q) => q.eq("messageId", messageId))
		.collect();
}

export async function findSolutionsByQuestionId(
	ctx: QueryCtx | MutationCtx,
	questionId: string,
	limit?: number,
) {
	const messages = await ctx.db
		.query("messages")
		.withIndex("by_questionId", (q) => q.eq("questionId", questionId))
		.collect();

	return messages.slice(0, limit ?? 100);
}

export async function deleteMessageInternalLogic(
	ctx: MutationCtx,
	id: string,
): Promise<void> {
	// Delete attachments
	const attachments = await ctx.db
		.query("attachments")
		.withIndex("by_messageId", (q) => q.eq("messageId", id))
		.collect();

	for (const attachment of attachments) {
		await ctx.db.delete(attachment._id);
	}

	// Delete reactions
	const reactions = await ctx.db
		.query("reactions")
		.withIndex("by_messageId", (q) => q.eq("messageId", id))
		.collect();

	for (const reaction of reactions) {
		await ctx.db.delete(reaction._id);
	}

	// Delete message
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
		attachments?: Attachment[];
		reactions?: Array<{
			userId: string;
			emoji: Infer<typeof emojiSchema>;
		}>;
	},
): Promise<void> {
	const { attachments, reactions } = args;
	const messageData = args.message;

	// Upsert message - use index for efficient lookup
	const existing = await ctx.db
		.query("messages")
		.withIndex("by_messageId", (q) => q.eq("id", messageData.id))
		.first();

	if (existing) {
		await ctx.db.replace(existing._id, messageData);
	} else {
		await ctx.db.insert("messages", messageData);
	}

	// Handle attachments
	if (attachments !== undefined) {
		// Delete existing attachments
		const existingAttachments = await ctx.db
			.query("attachments")
			.withIndex("by_messageId", (q) => q.eq("messageId", messageData.id))
			.collect();

		for (const attachment of existingAttachments) {
			await ctx.db.delete(attachment._id);
		}

		// Insert new attachments
		if (attachments.length > 0) {
			for (const attachment of attachments) {
				await ctx.db.insert("attachments", attachment);
			}
		}
	}

	// Handle reactions
	if (reactions !== undefined) {
		// Delete existing reactions
		const existingReactions = await ctx.db
			.query("reactions")
			.withIndex("by_messageId", (q) => q.eq("messageId", messageData.id))
			.collect();

		for (const reaction of existingReactions) {
			await ctx.db.delete(reaction._id);
		}

		// Insert emojis and reactions
		if (reactions.length > 0) {
			// Upsert emojis
			for (const reaction of reactions) {
				const emojiId = reaction.emoji.id;
				if (!emojiId) continue;

				const existingEmoji = await ctx.db
					.query("emojis")
					.filter((q) => q.eq(q.field("id"), emojiId))
					.first();

				if (!existingEmoji) {
					await ctx.db.insert("emojis", reaction.emoji);
				}
			}

			// Insert reactions
			for (const reaction of reactions) {
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

// ============================================================================
// Attachments
// ============================================================================

export async function uploadAttachmentFromUrlLogic(
	ctx: ActionCtx,
	args: {
		url: string;
		filename: string;
		contentType?: string;
	},
): Promise<Id<"_storage"> | null> {
	try {
		// Download the file from the URL
		const response = await fetch(args.url);

		if (!response.ok) {
			console.error(
				`Failed to download attachment from ${args.url}: ${response.status} ${response.statusText}`,
			);
			return null;
		}

		// Get the file as a blob
		const blob = await response.blob();

		// Upload to Convex storage
		const storageId = await ctx.storage.store(blob);

		return storageId;
	} catch (error) {
		console.error(`Error uploading attachment from ${args.url}:`, error);
		return null;
	}
}
