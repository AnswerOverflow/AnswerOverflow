import { defineSchema, defineTable } from "convex/server";
import { type Infer, v } from "convex/values";
import { literals } from "convex-helpers/validators";

export const forumTagSchema = v.object({
	id: v.int64(),
	name: v.string(),
	moderated: v.boolean(),
	emojiId: v.optional(v.int64()),
	emojiName: v.optional(v.string()),
});

export type ForumTag = Infer<typeof forumTagSchema>;

export const planValidator = literals(
	"FREE",
	"STARTER",
	"ADVANCED",
	"PRO",
	"ENTERPRISE",
	"OPEN_SOURCE",
);

export type Plan = Infer<typeof planValidator>;

const serverPreferencesSchema = v.object({
	serverId: v.int64(),
	stripeCustomerId: v.optional(v.string()),
	stripeSubscriptionId: v.optional(v.string()),
	plan: planValidator,
	readTheRulesConsentEnabled: v.optional(v.boolean()),
	considerAllMessagesPublicEnabled: v.optional(v.boolean()),
	anonymizeMessagesEnabled: v.optional(v.boolean()),
	customDomain: v.optional(v.string()),
	subpath: v.optional(v.string()),
	addedByUserId: v.optional(v.int64()),
});

export const serverSchema = v.object({
	discordId: v.int64(),
	name: v.string(),
	icon: v.optional(v.string()),
	description: v.optional(v.string()),
	vanityInviteCode: v.optional(v.string()),
	kickedTime: v.optional(v.number()),
	approximateMemberCount: v.number(),
});

export const discordAccountSchema = v.object({
	id: v.int64(), // Discord snowflake ID
	name: v.string(),
	avatar: v.optional(v.string()),
});

export const userServerSettingsSchema = v.object({
	serverId: v.int64(),
	userId: v.int64(), // Discord account ID (snowflake), not BetterAuth user ID
	permissions: v.number(), // Bitfield of permissions for the user in the server, this comes from Discord and is not allowed to be modified by the user
	canPubliclyDisplayMessages: v.boolean(),
	messageIndexingDisabled: v.boolean(),
	apiKey: v.optional(v.string()),
	apiCallsUsed: v.number(),
	botAddedTimestamp: v.optional(v.number()), // Timestamp when user clicked "Add to Server" button
});

export const ignoredDiscordAccountSchema = v.object({
	id: v.int64(), // Discord snowflake ID
});

export const channelSchema = v.object({
	id: v.int64(),
	serverId: v.int64(),
	name: v.string(),
	type: v.number(),
	parentId: v.optional(v.int64()),
	archivedTimestamp: v.optional(v.number()),
	availableTags: v.optional(v.array(forumTagSchema)),
	botPermissions: v.optional(v.union(v.string(), v.number())),
});

export const channelSettingsSchema = v.object({
	channelId: v.int64(),
	serverId: v.optional(v.int64()),
	indexingEnabled: v.boolean(),
	markSolutionEnabled: v.boolean(),
	sendMarkSolutionInstructionsInNewThreads: v.boolean(),
	autoThreadEnabled: v.boolean(),
	forumGuidelinesConsentEnabled: v.boolean(),
	solutionTagId: v.optional(v.int64()),
	lastIndexedSnowflake: v.optional(v.int64()),
	inviteCode: v.optional(v.string()),
});

const embedFooterSchema = v.object({
	text: v.string(),
	iconUrl: v.optional(v.string()),
	proxyIconUrl: v.optional(v.string()),
	iconStorageId: v.optional(v.id("_storage")),
	iconS3Key: v.optional(v.string()),
});

const embedImageSchema = v.object({
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
	storageId: v.optional(v.id("_storage")),
	s3Key: v.optional(v.string()),
});

const embedThumbnailSchema = v.object({
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
	storageId: v.optional(v.id("_storage")),
	s3Key: v.optional(v.string()),
});

const embedVideoSchema = v.object({
	url: v.optional(v.string()),
	proxyUrl: v.optional(v.string()),
	height: v.optional(v.number()),
	width: v.optional(v.number()),
	storageId: v.optional(v.id("_storage")),
	s3Key: v.optional(v.string()),
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
	iconStorageId: v.optional(v.id("_storage")),
	iconS3Key: v.optional(v.string()),
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
	id: v.int64(), // Discord snowflake ID
	authorId: v.int64(), // Discord account ID
	serverId: v.int64(), // Discord server ID
	channelId: v.int64(), // Discord channel ID
	parentChannelId: v.optional(v.int64()), // If message is in a thread, parent channel ID
	childThreadId: v.optional(v.int64()), // Thread started by this message
	questionId: v.optional(v.int64()), // If this is a solution, the question message ID
	referenceId: v.optional(v.int64()), // Referenced message ID
	applicationId: v.optional(v.int64()),
	interactionId: v.optional(v.int64()),
	webhookId: v.optional(v.int64()),
	content: v.string(),
	flags: v.optional(v.number()),
	type: v.optional(v.number()),
	pinned: v.optional(v.boolean()),
	nonce: v.optional(v.string()),
	tts: v.optional(v.boolean()),
	embeds: v.optional(v.array(embedSchema)),
});

export const attachmentSchema = v.object({
	id: v.int64(), // Discord attachment ID
	messageId: v.int64(), // Discord message ID
	contentType: v.optional(v.string()),
	filename: v.string(),
	width: v.optional(v.number()),
	height: v.optional(v.number()),
	size: v.number(),
	description: v.optional(v.string()),
	storageId: v.optional(v.id("_storage")), // Convex storage ID (dev/test only, for backwards compat)
});

export const emojiSchema = v.object({
	id: v.int64(), // Discord emoji ID (snowflake)
	name: v.string(),
	animated: v.optional(v.boolean()),
});

export const reactionSchema = v.object({
	messageId: v.int64(), // Discord message ID
	userId: v.int64(), // Discord account ID
	emojiId: v.int64(), // Discord emoji ID
});

export type ServerPreferences = Infer<typeof serverPreferencesSchema>;
export type Server = Infer<typeof serverSchema>;
export type Channel = Infer<typeof channelSchema>;
export type ChannelSettings = Infer<typeof channelSettingsSchema>;
export type DiscordAccount = Infer<typeof discordAccountSchema>;
export type UserServerSettings = Infer<typeof userServerSettingsSchema>;
export type Message = Infer<typeof messageSchema>;
export type Attachment = Infer<typeof attachmentSchema> & {
	url: string;
};
export type Emoji = Infer<typeof emojiSchema>;
export type Reaction = Infer<typeof reactionSchema>;
export type Embed = Infer<typeof embedSchema>;

export default defineSchema({
	servers: defineTable(serverSchema).index("by_discordId", ["discordId"]),
	serverPreferences: defineTable(serverPreferencesSchema)
		.index("by_serverId", ["serverId"])
		.index("by_customDomain", ["customDomain"])
		.index("by_stripeCustomerId", ["stripeCustomerId"]),
	discordAccounts: defineTable(discordAccountSchema).index(
		"by_discordAccountId",
		["id"],
	),
	userServerSettings: defineTable(userServerSettingsSchema)
		.index("by_serverId", ["serverId"])
		.index("by_userId", ["userId"])
		.index("by_userId_serverId", ["userId", "serverId"]),
	ignoredDiscordAccounts: defineTable(ignoredDiscordAccountSchema).index(
		"by_discordAccountId",
		["id"],
	),
	channels: defineTable(channelSchema)
		.index("by_serverId", ["serverId"])
		.index("by_serverId_and_type", ["serverId", "type"])
		.index("by_type", ["type"])
		.index("by_type_and_id", ["type", "id"])
		.index("by_discordChannelId", ["id"])
		.index("by_parentId", ["parentId"])
		.index("by_parentId_and_id", ["parentId", "id"])
		.searchIndex("search_name", {
			searchField: "name",
			filterFields: ["serverId", "type"],
		}),
	channelSettings: defineTable(channelSettingsSchema)
		.index("by_channelId", ["channelId"])
		.index("by_serverId", ["serverId"])
		.index("by_serverId_and_indexingEnabled", ["serverId", "indexingEnabled"])
		.index("by_inviteCode", ["inviteCode"]),
	messages: defineTable(messageSchema)
		.index("by_messageId", ["id"])
		.index("by_authorId", ["authorId"])
		.index("by_authorId_and_childThreadId", ["authorId", "childThreadId"])
		.index("by_serverId", ["serverId"])
		.index("by_serverId_and_questionId", ["serverId", "questionId"])
		.index("by_channelId", ["channelId"])
		.index("by_questionId", ["questionId"])
		.index("by_parentChannelId", ["parentChannelId"])
		.index("by_childThreadId", ["childThreadId"])
		.index("by_referenceId", ["referenceId"])
		.index("by_channelId_and_id", ["channelId", "id"])
		.searchIndex("search_content", {
			searchField: "content",
			filterFields: ["serverId", "channelId", "parentChannelId"],
		}),
	attachments: defineTable(attachmentSchema)
		.index("by_messageId", ["messageId"])
		.index("by_attachmentId", ["id"]),
	emojis: defineTable(emojiSchema).index("by_emojiId", ["id"]),
	reactions: defineTable(reactionSchema)
		.index("by_messageId", ["messageId"])
		.index("by_userId", ["userId"])
		.index("by_emojiId", ["emojiId"]),
});
