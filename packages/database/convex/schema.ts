import { defineSchema, defineTable } from "convex/server";
import { type Infer, v } from "convex/values";

const serverPreferencesSchema = v.object({
	serverId: v.id("servers"),
	readTheRulesConsentEnabled: v.optional(v.boolean()),
	considerAllMessagesPublicEnabled: v.optional(v.boolean()),
	anonymizeMessagesEnabled: v.optional(v.boolean()),
	customDomain: v.optional(v.string()),
	subpath: v.optional(v.string()),
});

export const serverSchema = v.object({
	discordId: v.string(),
	name: v.string(),
	icon: v.optional(v.string()),
	description: v.optional(v.string()),
	vanityInviteCode: v.optional(v.string()),
	kickedTime: v.optional(v.number()),
	vanityUrl: v.optional(v.string()),
	stripeCustomerId: v.optional(v.string()),
	stripeSubscriptionId: v.optional(v.string()),
	plan: v.union(
		v.literal("FREE"),
		v.literal("STARTER"),
		v.literal("ADVANCED"),
		v.literal("PRO"),
		v.literal("ENTERPRISE"),
		v.literal("OPEN_SOURCE"),
	),
	approximateMemberCount: v.number(),
	preferencesId: v.optional(v.id("serverPreferences")),
});

export const discordAccountSchema = v.object({
	id: v.string(), // Discord snowflake ID
	name: v.string(),
	avatar: v.optional(v.string()),
});

export const userServerSettingsSchema = v.object({
	serverId: v.id("servers"),
	userId: v.string(), // Discord account ID (snowflake), not BetterAuth user ID
	permissions: v.number(), // Bitfield of permissions for the user in the server, this comes from Discord and is not allowed to be modified by the user
	canPubliclyDisplayMessages: v.boolean(),
	messageIndexingDisabled: v.boolean(),
	apiKey: v.optional(v.string()),
	apiCallsUsed: v.number(),
	botAddedTimestamp: v.optional(v.number()), // Timestamp when user clicked "Add to Server" button
});

export const ignoredDiscordAccountSchema = v.object({
	id: v.string(), // Discord snowflake ID
});

export const channelSchema = v.object({
	id: v.string(),
	serverId: v.id("servers"),
	name: v.string(),
	type: v.number(),
	parentId: v.optional(v.string()),
	inviteCode: v.optional(v.string()),
	archivedTimestamp: v.optional(v.number()),
	solutionTagId: v.optional(v.string()),
	lastIndexedSnowflake: v.optional(v.string()),
});

export const channelSettingsSchema = v.object({
	channelId: v.string(),
	indexingEnabled: v.boolean(),
	markSolutionEnabled: v.boolean(),
	sendMarkSolutionInstructionsInNewThreads: v.boolean(),
	autoThreadEnabled: v.boolean(),
	forumGuidelinesConsentEnabled: v.boolean(),
});

const embedFooterSchema = v.object({
	text: v.string(),
	iconUrl: v.optional(v.string()),
	proxyIconUrl: v.optional(v.string()),
});

const embedImageSchema = v.object({
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
});

const embedThumbnailSchema = v.object({
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
});

const embedVideoSchema = v.object({
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
});

const embedProviderSchema = v.object({
	name: v.optional(v.string()),
	url: v.optional(v.string()),
});

const embedAuthorSchema = v.object({
	name: v.optional(v.string()),
	url: v.optional(v.string()),
	iconUrl: v.optional(v.string()),
	proxyIconUrl: v.optional(v.string()),
});

const embedFieldSchema = v.object({
	name: v.string(),
	value: v.string(),
	inline: v.optional(v.boolean()),
});

const embedSchema = v.object({
	title: v.optional(v.string()),
	type: v.optional(v.string()),
	description: v.optional(v.string()),
	url: v.optional(v.string()),
	timestamp: v.optional(v.string()), // ISO8601 timestamp
	color: v.optional(v.number()),
	footer: v.optional(embedFooterSchema),
	image: v.optional(embedImageSchema),
	thumbnail: v.optional(embedThumbnailSchema),
	video: v.optional(embedVideoSchema),
	provider: v.optional(embedProviderSchema),
	author: v.optional(embedAuthorSchema),
	fields: v.optional(v.array(embedFieldSchema)),
});

export const messageSchema = v.object({
	id: v.string(), // Discord snowflake ID
	authorId: v.string(), // Discord account ID
	serverId: v.id("servers"),
	channelId: v.string(), // Discord channel ID
	parentChannelId: v.optional(v.string()), // If message is in a thread, parent channel ID
	childThreadId: v.optional(v.string()), // Thread started by this message
	questionId: v.optional(v.string()), // If this is a solution, the question message ID
	referenceId: v.optional(v.string()), // Referenced message ID
	applicationId: v.optional(v.string()),
	interactionId: v.optional(v.string()),
	webhookId: v.optional(v.string()),
	content: v.string(),
	flags: v.optional(v.number()),
	type: v.optional(v.number()),
	pinned: v.optional(v.boolean()),
	nonce: v.optional(v.string()),
	tts: v.optional(v.boolean()),
	embeds: v.optional(v.array(embedSchema)),
});

export const attachmentSchema = v.object({
	id: v.string(), // Discord attachment ID
	messageId: v.string(), // Discord message ID
	contentType: v.optional(v.string()),
	filename: v.string(),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	size: v.number(),
	description: v.optional(v.string()),
	storageId: v.optional(v.id("_storage")), // Convex storage ID for the uploaded file
});

export const emojiSchema = v.object({
	id: v.string(), // Discord emoji ID (snowflake)
	name: v.string(),
});

export const reactionSchema = v.object({
	messageId: v.string(), // Discord message ID
	userId: v.string(), // Discord account ID
	emojiId: v.string(), // Discord emoji ID
});

export const anonymousSessionSchema = v.object({
	sessionId: v.string(), // Session ID
	createdAt: v.number(), // Timestamp when the session was created
	expiresAt: v.number(), // Timestamp when the session will expire
});

export type ServerPreferences = Infer<typeof serverPreferencesSchema>;
export type Server = Infer<typeof serverSchema>;
export type Channel = Infer<typeof channelSchema>;
export type ChannelSettings = Infer<typeof channelSettingsSchema>;
export type DiscordAccount = Infer<typeof discordAccountSchema>;
export type UserServerSettings = Infer<typeof userServerSettingsSchema>;
export type Message = Infer<typeof messageSchema>;
export type Attachment = Infer<typeof attachmentSchema>;
export type Emoji = Infer<typeof emojiSchema>;
export type Reaction = Infer<typeof reactionSchema>;
export type Embed = Infer<typeof embedSchema>;

export default defineSchema({
	servers: defineTable(serverSchema).index("by_discordId", ["discordId"]),
	serverPreferences: defineTable(serverPreferencesSchema).index("by_serverId", [
		"serverId",
	]),
	discordAccounts: defineTable(discordAccountSchema).index(
		"by_discordAccountId",
		["id"],
	),
	userServerSettings: defineTable(userServerSettingsSchema)
		.index("by_serverId", ["serverId"])
		.index("by_userId", ["userId"]),
	ignoredDiscordAccounts: defineTable(ignoredDiscordAccountSchema).index(
		"by_discordAccountId",
		["id"],
	),
	channels: defineTable(channelSchema)
		.index("by_serverId", ["serverId"])
		.index("by_type", ["type"])
		.index("by_discordChannelId", ["id"])
		.index("by_parentId", ["parentId"]),
	channelSettings: defineTable(channelSettingsSchema).index("by_channelId", [
		"channelId",
	]),
	messages: defineTable(messageSchema)
		.index("by_messageId", ["id"])
		.index("by_authorId", ["authorId"])
		.index("by_serverId", ["serverId"])
		.index("by_channelId", ["channelId"])
		.index("by_questionId", ["questionId"])
		.index("by_parentChannelId", ["parentChannelId"])
		.searchIndex("search_content", {
			searchField: "content",
		}),
	attachments: defineTable(attachmentSchema)
		.index("by_messageId", ["messageId"])
		.index("by_attachmentId", ["id"]),
	emojis: defineTable(emojiSchema).index("by_emojiId", ["id"]),
	reactions: defineTable(reactionSchema)
		.index("by_messageId", ["messageId"])
		.index("by_userId", ["userId"])
		.index("by_emojiId", ["emojiId"]),
	anonymousSessions: defineTable(anonymousSessionSchema).index("by_sessionId", [
		"sessionId",
	]),
});
