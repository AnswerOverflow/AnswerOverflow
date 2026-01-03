import {
	compileSchema,
	defineSchema,
	defineTable,
	Id,
} from "@packages/confect/server";
import { Schema } from "effect";

const ForumTagSchema = Schema.Struct({
	id: Schema.BigIntFromSelf,
	name: Schema.String,
	moderated: Schema.Boolean,
	emojiId: Schema.optional(Schema.BigIntFromSelf),
	emojiName: Schema.optional(Schema.String),
});

const ThreadTagSchema = Schema.Struct({
	threadId: Schema.BigIntFromSelf,
	tagId: Schema.BigIntFromSelf,
	parentChannelId: Schema.BigIntFromSelf,
});

const PlanSchema = Schema.Literal(
	"FREE",
	"STARTER",
	"ADVANCED",
	"PRO",
	"ENTERPRISE",
	"OPEN_SOURCE",
);

const ServerPreferencesSchema = Schema.Struct({
	serverId: Schema.BigIntFromSelf,
	stripeCustomerId: Schema.optional(Schema.String),
	stripeSubscriptionId: Schema.optional(Schema.String),
	plan: PlanSchema,
	readTheRulesConsentEnabled: Schema.optional(Schema.Boolean),
	considerAllMessagesPublicEnabled: Schema.optional(Schema.Boolean),
	anonymizeMessagesEnabled: Schema.optional(Schema.Boolean),
	customDomain: Schema.optional(Schema.String),
	subpath: Schema.optional(Schema.String),
	addedByUserId: Schema.optional(Schema.BigIntFromSelf),
	botNickname: Schema.optional(Schema.String),
	botAvatarStorageId: Schema.optional(Id.Id("_storage")),
	botBannerStorageId: Schema.optional(Id.Id("_storage")),
	botBio: Schema.optional(Schema.String),
});

const ServerSchema = Schema.Struct({
	discordId: Schema.BigIntFromSelf,
	name: Schema.String,
	icon: Schema.optional(Schema.String),
	banner: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	vanityInviteCode: Schema.optional(Schema.String),
	kickedTime: Schema.optional(Schema.Number),
	approximateMemberCount: Schema.Number,
});

const DiscordAccountSchema = Schema.Struct({
	id: Schema.BigIntFromSelf, // Discord snowflake ID
	name: Schema.String,
	avatar: Schema.optional(Schema.String),
});

const UserServerSettingsSchema = Schema.Struct({
	serverId: Schema.BigIntFromSelf,
	userId: Schema.BigIntFromSelf, // Discord account ID (snowflake), not BetterAuth user ID
	permissions: Schema.Number, // Bitfield of permissions for the user in the server, this comes from Discord and is not allowed to be modified by the user
	canPubliclyDisplayMessages: Schema.Boolean,
	messageIndexingDisabled: Schema.Boolean,
	apiKey: Schema.optional(Schema.String),
	apiCallsUsed: Schema.Number,
	botAddedTimestamp: Schema.optional(Schema.Number), // Timestamp when user clicked "Add to Server" button
});

const IgnoredDiscordAccountSchema = Schema.Struct({
	id: Schema.BigIntFromSelf, // Discord snowflake ID
});

const ChannelSchema = Schema.Struct({
	id: Schema.BigIntFromSelf,
	serverId: Schema.BigIntFromSelf,
	name: Schema.String,
	type: Schema.Number,
	parentId: Schema.optional(Schema.BigIntFromSelf),
	archivedTimestamp: Schema.optional(Schema.Number),
	availableTags: Schema.optional(
		Schema.Array(ForumTagSchema).pipe(Schema.mutable),
	),
	botPermissions: Schema.optional(Schema.Union(Schema.String, Schema.Number)),
});

const ChannelSettingsSchema = Schema.Struct({
	channelId: Schema.BigIntFromSelf,
	serverId: Schema.optional(Schema.BigIntFromSelf),
	indexingEnabled: Schema.Boolean,
	markSolutionEnabled: Schema.Boolean,
	sendMarkSolutionInstructionsInNewThreads: Schema.Boolean,
	autoThreadEnabled: Schema.Boolean,
	forumGuidelinesConsentEnabled: Schema.Boolean,
	solutionTagId: Schema.optional(Schema.BigIntFromSelf),
	lastIndexedSnowflake: Schema.optional(Schema.BigIntFromSelf),
	inviteCode: Schema.optional(Schema.String),
});

const EmbedFooterSchema = Schema.Struct({
	text: Schema.String,
	iconUrl: Schema.optional(Schema.String),
	proxyIconUrl: Schema.optional(Schema.String),
	iconStorageId: Schema.optional(Id.Id("_storage")),
	iconS3Key: Schema.optional(Schema.String),
});

const EmbedImageSchema = Schema.Struct({
	url: Schema.optional(Schema.String),
	proxyUrl: Schema.optional(Schema.String),
	height: Schema.optional(Schema.Number),
	width: Schema.optional(Schema.Number),
	storageId: Schema.optional(Id.Id("_storage")),
	s3Key: Schema.optional(Schema.String),
});

const EmbedThumbnailSchema = Schema.Struct({
	url: Schema.optional(Schema.String),
	proxyUrl: Schema.optional(Schema.String),
	height: Schema.optional(Schema.Number),
	width: Schema.optional(Schema.Number),
	storageId: Schema.optional(Id.Id("_storage")),
	s3Key: Schema.optional(Schema.String),
});

const EmbedVideoSchema = Schema.Struct({
	url: Schema.optional(Schema.String),
	proxyUrl: Schema.optional(Schema.String),
	height: Schema.optional(Schema.Number),
	width: Schema.optional(Schema.Number),
	storageId: Schema.optional(Id.Id("_storage")),
	s3Key: Schema.optional(Schema.String),
});

const EmbedProviderSchema = Schema.Struct({
	name: Schema.optional(Schema.String),
	url: Schema.optional(Schema.String),
});

const EmbedAuthorSchema = Schema.Struct({
	name: Schema.optional(Schema.String),
	url: Schema.optional(Schema.String),
	iconUrl: Schema.optional(Schema.String),
	proxyIconUrl: Schema.optional(Schema.String),
	iconStorageId: Schema.optional(Id.Id("_storage")),
	iconS3Key: Schema.optional(Schema.String),
});

const EmbedFieldSchema = Schema.Struct({
	name: Schema.String,
	value: Schema.String,
	inline: Schema.optional(Schema.Boolean),
});

const EmbedSchema = Schema.Struct({
	title: Schema.optional(Schema.String),
	type: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	url: Schema.optional(Schema.String),
	timestamp: Schema.optional(Schema.String), // ISO8601 timestamp
	color: Schema.optional(Schema.Number),
	footer: Schema.optional(EmbedFooterSchema),
	image: Schema.optional(EmbedImageSchema),
	thumbnail: Schema.optional(EmbedThumbnailSchema),
	video: Schema.optional(EmbedVideoSchema),
	provider: Schema.optional(EmbedProviderSchema),
	author: Schema.optional(EmbedAuthorSchema),
	fields: Schema.optional(Schema.Array(EmbedFieldSchema).pipe(Schema.mutable)),
});

const StickerSchema = Schema.Struct({
	id: Schema.BigIntFromSelf, // Discord sticker ID
	name: Schema.String,
	formatType: Schema.Number, // 1=PNG, 2=APNG, 3=Lottie, 4=GIF
});

const MessageSchema = Schema.Struct({
	id: Schema.BigIntFromSelf, // Discord snowflake ID
	authorId: Schema.BigIntFromSelf, // Discord account ID
	serverId: Schema.BigIntFromSelf, // Discord server ID
	channelId: Schema.BigIntFromSelf, // Discord channel ID
	parentChannelId: Schema.optional(Schema.BigIntFromSelf), // If message is in a thread, parent channel ID
	childThreadId: Schema.optional(Schema.BigIntFromSelf), // Thread started by this message
	questionId: Schema.optional(Schema.BigIntFromSelf), // If this is a solution, the question message ID
	referenceId: Schema.optional(Schema.BigIntFromSelf), // Referenced message ID
	applicationId: Schema.optional(Schema.BigIntFromSelf),
	interactionId: Schema.optional(Schema.BigIntFromSelf),
	webhookId: Schema.optional(Schema.BigIntFromSelf),
	content: Schema.String,
	flags: Schema.optional(Schema.Number),
	type: Schema.optional(Schema.Number),
	pinned: Schema.optional(Schema.Boolean),
	nonce: Schema.optional(Schema.String),
	tts: Schema.optional(Schema.Boolean),
	embeds: Schema.optional(Schema.Array(EmbedSchema).pipe(Schema.mutable)),
	stickers: Schema.optional(Schema.Array(StickerSchema).pipe(Schema.mutable)),
});

const AttachmentSchema = Schema.Struct({
	id: Schema.BigIntFromSelf, // Discord attachment ID
	messageId: Schema.BigIntFromSelf, // Discord message ID
	contentType: Schema.optional(Schema.String),
	filename: Schema.String,
	width: Schema.optional(Schema.Number),
	height: Schema.optional(Schema.Number),
	size: Schema.Number,
	description: Schema.optional(Schema.String),
	storageId: Schema.optional(Id.Id("_storage")), // Convex storage ID (dev/test only, for backwards compat)
});

const EmojiSchema = Schema.Struct({
	id: Schema.BigIntFromSelf, // Discord emoji ID (snowflake)
	name: Schema.String,
	animated: Schema.optional(Schema.Boolean),
});

const ReactionSchema = Schema.Struct({
	messageId: Schema.BigIntFromSelf, // Discord message ID
	userId: Schema.BigIntFromSelf, // Discord account ID
	emojiId: Schema.BigIntFromSelf, // Discord emoji ID
});

const GitHubIssueStatusSchema = Schema.Literal("open", "closed");

const GitHubIssueSchema = Schema.Struct({
	issueId: Schema.Number,
	issueNumber: Schema.Number,
	repoOwner: Schema.String,
	repoName: Schema.String,
	issueUrl: Schema.String,
	issueTitle: Schema.String,
	discordServerId: Schema.BigIntFromSelf,
	discordChannelId: Schema.BigIntFromSelf,
	discordMessageId: Schema.BigIntFromSelf,
	discordThreadId: Schema.optional(Schema.BigIntFromSelf),
	createdByUserId: Schema.String,
	status: GitHubIssueStatusSchema,
});

const RepoContextSchema = Schema.Struct({
	owner: Schema.String,
	repo: Schema.String,
	filePath: Schema.optional(Schema.String),
});

const AgentStatusSchema = Schema.Literal(
	"idle",
	"cloning_repo",
	"thinking",
	"responding",
	"error",
);

const ChatThreadMetadataSchema = Schema.Struct({
	threadId: Schema.String,
	repos: Schema.optional(Schema.Array(RepoContextSchema).pipe(Schema.mutable)),
	modelId: Schema.optional(Schema.String),
	agentStatus: Schema.optional(AgentStatusSchema),
	agentError: Schema.optional(Schema.String),
});

export const confectSchema = defineSchema({
	servers: defineTable(ServerSchema).index("by_discordId", ["discordId"]),
	serverPreferences: defineTable(ServerPreferencesSchema)
		.index("by_serverId", ["serverId"])
		.index("by_customDomain", ["customDomain"])
		.index("by_stripeCustomerId", ["stripeCustomerId"]),
	discordAccounts: defineTable(DiscordAccountSchema).index(
		"by_discordAccountId",
		["id"],
	),
	userServerSettings: defineTable(UserServerSettingsSchema)
		.index("by_serverId", ["serverId"])
		.index("by_userId", ["userId"])
		.index("by_userId_serverId", ["userId", "serverId"]),
	ignoredDiscordAccounts: defineTable(IgnoredDiscordAccountSchema).index(
		"by_discordAccountId",
		["id"],
	),
	channels: defineTable(ChannelSchema)
		.index("by_serverId", ["serverId"])
		.index("by_serverId_and_id", ["serverId", "id"])
		.index("by_serverId_and_type", ["serverId", "type"])
		.index("by_type", ["type"])
		.index("by_type_and_id", ["type", "id"])
		.index("by_discordChannelId", ["id"])
		.index("by_parentId", ["parentId"])
		.index("by_parentId_and_id", ["parentId", "id"])
		.searchIndex("search_name", {
			searchField: "name",
			filterFields: ["serverId", "type", "parentId"],
		}),
	channelSettings: defineTable(ChannelSettingsSchema)
		.index("by_channelId", ["channelId"])
		.index("by_serverId", ["serverId"])
		.index("by_serverId_and_indexingEnabled", ["serverId", "indexingEnabled"])
		.index("by_inviteCode", ["inviteCode"]),
	messages: defineTable(MessageSchema)
		.index("by_messageId", ["id"])
		.index("by_authorId", ["authorId"])
		.index("by_authorId_and_childThreadId", ["authorId", "childThreadId"])
		.index("by_serverId", ["serverId"])
		.index("by_serverId_and_questionId", ["serverId", "questionId"])
		.index("by_channelId", ["channelId"])
		.index("by_questionId", ["questionId"])
		.index("by_childThreadId", ["childThreadId"])
		.index("by_channelId_and_id", ["channelId", "id"])
		.searchIndex("search_content", {
			searchField: "content",
			filterFields: ["serverId", "channelId", "parentChannelId"],
		}),
	attachments: defineTable(AttachmentSchema)
		.index("by_messageId", ["messageId"])
		.index("by_attachmentId", ["id"]),
	emojis: defineTable(EmojiSchema).index("by_emojiId", ["id"]),
	reactions: defineTable(ReactionSchema)
		.index("by_messageId", ["messageId"])
		.index("by_userId", ["userId"])
		.index("by_emojiId", ["emojiId"]),
	threadTags: defineTable(ThreadTagSchema)
		.index("by_threadId", ["threadId"])
		.index("by_parentChannelId_and_tagId", ["parentChannelId", "tagId"]),
	githubIssues: defineTable(GitHubIssueSchema)
		.index("by_repoOwner_and_repoName_and_issueNumber", [
			"repoOwner",
			"repoName",
			"issueNumber",
		])
		.index("by_discordMessageId", ["discordMessageId"])
		.index("by_createdByUserId", ["createdByUserId"]),
	chatThreadMetadata: defineTable(ChatThreadMetadataSchema).index(
		"by_threadId",
		["threadId"],
	),
});

export default confectSchema.convexSchemaDefinition;

export {
	ForumTagSchema,
	ThreadTagSchema,
	PlanSchema,
	ServerPreferencesSchema,
	ServerSchema,
	DiscordAccountSchema,
	UserServerSettingsSchema,
	IgnoredDiscordAccountSchema,
	ChannelSchema,
	ChannelSettingsSchema,
	EmbedSchema,
	StickerSchema,
	MessageSchema,
	AttachmentSchema,
	EmojiSchema,
	ReactionSchema,
	GitHubIssueStatusSchema,
	GitHubIssueSchema,
};

export const serverSchema = compileSchema(ServerSchema);
export const channelSchema = compileSchema(ChannelSchema);
export const channelSettingsSchema = compileSchema(ChannelSettingsSchema);
export const messageSchema = compileSchema(MessageSchema);
export const attachmentSchema = compileSchema(AttachmentSchema);
export const emojiSchema = compileSchema(EmojiSchema);
export const discordAccountSchema = compileSchema(DiscordAccountSchema);
export const userServerSettingsSchema = compileSchema(UserServerSettingsSchema);

export const planValidator = compileSchema(PlanSchema);
export const githubIssueStatusValidator = compileSchema(
	GitHubIssueStatusSchema,
);

export type Plan = Schema.Schema.Type<typeof PlanSchema>;
export type Channel = Schema.Schema.Type<typeof ChannelSchema>;
export type ChannelSettings = Schema.Schema.Type<typeof ChannelSettingsSchema>;
export type Message = Schema.Schema.Type<typeof MessageSchema>;
export type Attachment = Schema.Schema.Type<typeof AttachmentSchema> & {
	url: string;
};
export type Emoji = Schema.Schema.Type<typeof EmojiSchema>;
export type Sticker = Schema.Schema.Type<typeof StickerSchema>;
export type Server = Schema.Schema.Type<typeof ServerSchema>;
export type ServerPreferences = Schema.Schema.Type<
	typeof ServerPreferencesSchema
>;
export type DiscordAccount = Schema.Schema.Type<typeof DiscordAccountSchema>;
export type UserServerSettings = Schema.Schema.Type<
	typeof UserServerSettingsSchema
>;
export type GitHubIssue = Schema.Schema.Type<typeof GitHubIssueSchema>;
export type Embed = Schema.Schema.Type<typeof EmbedSchema>;
export type ForumTag = Schema.Schema.Type<typeof ForumTagSchema>;
export type AgentStatus = Schema.Schema.Type<typeof AgentStatusSchema>;
