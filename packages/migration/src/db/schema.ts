import {
	bigint,
	boolean,
	customType,
	datetime,
	index,
	int,
	json,
	mysqlEnum,
	mysqlTable,
	primaryKey,
	unique,
	varchar,
} from "drizzle-orm/mysql-core";

const unsignedInt = customType<{
	data: number;
}>({
	dataType() {
		return "int unsigned";
	},
});

const snowflake = customType<{
	data: string;
}>({
	dataType() {
		return "bigint";
	},
	fromDriver(value: unknown) {
		return String(value);
	},
});

export const plans = [
	"FREE",
	"STARTER",
	"ADVANCED",
	"PRO",
	"ENTERPRISE",
	"OPEN_SOURCE",
] as const;

export type Plan = (typeof plans)[number];

export type Embed = {
	title?: string;
	type?: string;
	description?: string;
	url?: string;
	timestamp?: string;
	color?: number;
	footer?: {
		text: string;
		iconUrl?: string;
		proxyIconUrl?: string;
	};
	image?: {
		url?: string;
		proxyUrl?: string;
		height?: number;
		width?: number;
	};
	thumbnail?: {
		url?: string;
		proxyUrl?: string;
		height?: number;
		width?: number;
	};
	video?: {
		url?: string;
		proxyUrl?: string;
		height?: number;
		width?: number;
	};
	provider?: {
		name?: string;
		url?: string;
	};
	author?: {
		name?: string;
		url?: string;
		iconUrl?: string;
		proxyIconUrl?: string;
	};
	fields?: {
		name: string;
		value: string;
		inline?: boolean;
	}[];
};

export const dbServers = mysqlTable(
	"Server",
	{
		id: snowflake("id").notNull(),
		name: varchar("name", { length: 200 }).notNull(),
		icon: varchar("icon", { length: 45 }),
		description: varchar("description", { length: 191 }),
		vanityInviteCode: varchar("vanityInviteCode", { length: 191 }),
		bitfield: unsignedInt("bitfield").default(0).notNull(),
		kickedTime: datetime("kickedTime", { mode: "date", fsp: 3 }),
		vanityUrl: varchar("vanityUrl", { length: 191 }),
		customDomain: varchar("customDomain", { length: 191 }),
		subpath: varchar("subpath", { length: 191 }),
		stripeCustomerId: varchar("stripeCustomerId", { length: 191 }),
		stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 191 }),
		plan: mysqlEnum("plan", plans).default("FREE").notNull(),
		approximateMemberCount: int("approximateMemberCount").default(0).notNull(),
	},
	(table) => {
		return {
			serverId: primaryKey({ columns: [table.id] }),
			serverIdKey: unique("Server_id_key").on(table.id),
			serverVanityInviteCodeKey: index("Server_vanityInviteCode_idx").on(
				table.vanityInviteCode,
			),
			serverVanityUrlKey: unique("Server_vanityUrl_key").on(table.vanityUrl),
			serverCustomDomainKey: unique("Server_customDomain_key").on(
				table.customDomain,
			),
			serverStripeCustomerIdKey: unique("Server_stripeCustomerId_key").on(
				table.stripeCustomerId,
			),
			serverStripeSubscriptionIdKey: unique(
				"Server_stripeSubscriptionId_key",
			).on(table.stripeSubscriptionId),
		};
	},
);

export type Server = typeof dbServers.$inferSelect;

export const dbChannels = mysqlTable(
	"Channel",
	{
		id: snowflake("id").notNull(),
		serverId: snowflake("serverId").notNull(),
		name: varchar("name", { length: 200 }).notNull(),
		type: int("type").notNull(),
		parentId: snowflake("parentId"),
		inviteCode: varchar("inviteCode", { length: 15 }),
		archivedTimestamp: bigint("archivedTimestamp", { mode: "bigint" }),
		bitfield: unsignedInt("bitfield").default(0).notNull(),
		solutionTagId: snowflake("solutionTagId"),
		lastIndexedSnowflake: snowflake("lastIndexedSnowflake"),
	},
	(table) => {
		return {
			serverIdIdx: index("Channel_serverId_idx").on(table.serverId),
			parentIdIdx: index("Channel_parentId_idx").on(table.parentId),
			inviteCodeKey: unique("Channel_inviteCode_key").on(table.inviteCode),
			channelId: primaryKey({ columns: [table.id] }),
		};
	},
);

export type Channel = typeof dbChannels.$inferSelect;

export const dbDiscordAccounts = mysqlTable(
	"DiscordAccount",
	{
		id: snowflake("id").notNull(),
		name: varchar("name", { length: 191 }).notNull(),
		avatar: varchar("avatar", { length: 191 }),
	},
	(table) => {
		return {
			discordAccountId: primaryKey({ columns: [table.id] }),
			discordAccountIdKey: unique("DiscordAccount_id_key").on(table.id),
		};
	},
);

export type DiscordAccount = typeof dbDiscordAccounts.$inferSelect;

export const dbUserServerSettings = mysqlTable(
	"UserServerSettings",
	{
		userId: snowflake("userId").notNull(),
		serverId: snowflake("serverId").notNull(),
		bitfield: unsignedInt("bitfield").default(0).notNull(),
		apiKey: varchar("apiKey", { length: 255 }),
		apiCallsUsed: int("apiCallsUsed").default(0).notNull(),
	},
	(table) => {
		return {
			userServerSettingsUserIdServerId: primaryKey({
				columns: [table.userId, table.serverId],
			}),
			userIdIdx: index("UserServerSettings_userId_idx").on(table.userId),
			serverIdIdx: index("UserServerSettings_serverId_idx").on(table.serverId),
			apiKeyIdx: index("UserServerSettings_apiKey_idx").on(table.apiKey),
		};
	},
);

export type UserServerSettings = typeof dbUserServerSettings.$inferSelect;

export const dbIgnoredDiscordAccounts = mysqlTable(
	"IgnoredDiscordAccount",
	{
		id: snowflake("id").notNull(),
	},
	(table) => {
		return {
			ignoredDiscordAccountId: primaryKey({ columns: [table.id] }),
			ignoredDiscordAccountIdKey: unique("IgnoredDiscordAccount_id_key").on(
				table.id,
			),
		};
	},
);

export type IgnoredDiscordAccount =
	typeof dbIgnoredDiscordAccounts.$inferSelect;

export const dbMessages = mysqlTable(
	"Message",
	{
		id: snowflake("id").notNull(),
		authorId: snowflake("authorId").notNull(),
		serverId: snowflake("serverId").notNull(),
		channelId: snowflake("channelId").notNull(),
		parentChannelId: snowflake("parentChannelId"),
		childThreadId: snowflake("childThreadId"),
		questionId: snowflake("questionId"),
		referenceId: snowflake("referenceId"),
		applicationId: snowflake("applicationId"),
		interactionId: snowflake("interactionId"),
		webhookId: snowflake("webhookId"),
		content: varchar("content", { length: 4100 }).notNull(),
		flags: int("flags"),
		type: int("type"),
		pinned: boolean("pinned"),
		nonce: varchar("nonce", { length: 191 }),
		tts: boolean("tts"),
		embeds: json("embeds").$type<Embed[]>(),
	},
	(table) => {
		return {
			authorIdIdx: index("Message_authorId_idx").on(table.authorId),
			serverIdIdx: index("Message_serverId_idx").on(table.serverId),
			channelIdIdx: index("Message_channelId_idx").on(table.channelId),
			parentChannelIdIdx: index("Message_parentChannelId_idx").on(
				table.parentChannelId,
			),
			childThreadIdIdx: index("Message_childThreadId_idx").on(
				table.childThreadId,
			),
			questionIdIdx: index("Message_questionId_idx").on(table.questionId),
			referenceIdIdx: index("Message_referenceId_idx").on(table.referenceId),
			messageId: primaryKey({ columns: [table.id] }),
		};
	},
);

export type Message = typeof dbMessages.$inferSelect;

export const dbEmojis = mysqlTable(
	"Emoji",
	{
		id: snowflake("id").notNull(),
		name: varchar("name", { length: 191 }).notNull(),
	},
	(table) => {
		return {
			emojiId: primaryKey({ columns: [table.id] }),
		};
	},
);

export type Emoji = typeof dbEmojis.$inferSelect;

export const dbReactions = mysqlTable(
	"Reaction",
	{
		messageId: snowflake("messageId").notNull(),
		userId: snowflake("userId").notNull(),
		emojiId: snowflake("emojiId").notNull(),
	},
	(table) => {
		return {
			reactionId: primaryKey({
				columns: [table.messageId, table.userId, table.emojiId],
			}),
			messageIdIdx: index("Reaction_messageId_idx").on(table.messageId),
			userIdIdx: index("Reaction_userId_idx").on(table.userId),
			emojiIdIdx: index("Reaction_emojiId_idx").on(table.emojiId),
		};
	},
);

export type Reaction = typeof dbReactions.$inferSelect;

export const dbAttachments = mysqlTable(
	"Attachment",
	{
		id: varchar("id", { length: 191 }).notNull(),
		messageId: snowflake("messageId").notNull(),
		contentType: varchar("contentType", { length: 191 }),
		filename: varchar("filename", { length: 1024 }).notNull(),
		proxyUrl: varchar("proxyUrl", { length: 1024 }).notNull(),
		url: varchar("url", { length: 1024 }).notNull(),
		width: int("width"),
		height: int("height"),
		size: int("size").notNull(),
		description: varchar("description", { length: 1000 }),
	},
	(table) => {
		return {
			attachmentId: primaryKey({ columns: [table.id] }),
			messageIdIdx: index("Attachment_messageId_idx").on(table.messageId),
		};
	},
);

export type Attachment = typeof dbAttachments.$inferSelect;
