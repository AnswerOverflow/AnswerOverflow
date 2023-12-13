import {
	int,
	mysqlTable,
	primaryKey,
	varchar,
	datetime,
	mysqlEnum,
	bigint,
	index,
	unique,
	customType,
	boolean,
	json,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';
const unsignedInt = customType<{
	data: number; // TODO: BigInt?
}>({
	dataType() {
		return 'int unsigned';
	},
});

const snowflake = customType<{
	data: string;
}>({
	dataType() {
		return 'bigint';
	},
	// @ts-ignore
	fromDriver(value: string) {
		return value.toString();
	},
});

export const dbUsers = mysqlTable(
	'User',
	{
		id: varchar('id', { length: 191 }).notNull(),
		name: varchar('name', { length: 191 }),
		email: varchar('email', { length: 191 }),
		emailVerified: datetime('emailVerified', { mode: 'date', fsp: 3 }),
		image: varchar('image', { length: 191 }),
	},
	(table) => {
		return {
			userId: primaryKey(table.id),
			userEmailKey: unique('User_email_key').on(table.email),
		};
	},
);

export type User = typeof dbUsers.$inferSelect;

export const usersRelations = relations(dbUsers, ({ many }) => ({
	accounts: many(dbAccounts),
	sessions: many(dbSessions, {
		relationName: 'user-sessions',
	}),
}));

export const dbAccounts = mysqlTable(
	'Account',
	{
		id: varchar('id', { length: 191 }).notNull(),
		userId: varchar('userId', { length: 191 }).notNull(),
		type: varchar('type', { length: 191 }).notNull(),
		provider: varchar('provider', { length: 191 }).notNull(),
		providerAccountId: varchar('providerAccountId', { length: 191 }).notNull(),
		refresh_token: varchar('refresh_token', { length: 191 }),
		access_token: varchar('access_token', { length: 191 }),
		expires_at: int('expires_at'),
		token_type: varchar('token_type', { length: 191 }),
		scope: varchar('scope', { length: 191 }),
		idToken: varchar('id_token', { length: 191 }),
		session_state: varchar('session_state', { length: 191 }),
	},
	(table) => {
		return {
			userIdIdx: index('Account_userId_idx').on(table.userId),
			accountId: primaryKey(table.id),
			accountProviderAccountIdKey: unique('Account_providerAccountId_key').on(
				table.providerAccountId,
			),
			accountProviderProviderAccountIdKey: unique(
				'Account_provider_providerAccountId_key',
			).on(table.provider, table.providerAccountId),
		};
	},
);

export type Account = typeof dbAccounts.$inferSelect;

export const accountRelations = relations(dbAccounts, ({ one }) => ({
	user: one(dbUsers, {
		fields: [dbAccounts.userId],
		references: [dbUsers.id],
	}),
	discordAccount: one(dbDiscordAccounts, {
		fields: [dbAccounts.providerAccountId],
		references: [dbDiscordAccounts.id],
	}),
}));

export const dbSessions = mysqlTable(
	'Session',
	{
		id: varchar('id', { length: 191 }).notNull(),
		sessionToken: varchar('sessionToken', { length: 191 }).notNull(),
		userId: varchar('userId', { length: 191 }).notNull(),
		expires: datetime('expires', { mode: 'date', fsp: 3 }).notNull(),
	},
	(table) => {
		return {
			userIdIdx: index('Session_userId_idx').on(table.userId),
			sessionId: primaryKey(table.id),
			sessionSessionTokenKey: unique('Session_sessionToken_key').on(
				table.sessionToken,
			),
		};
	},
);

export const sessionRelations = relations(dbSessions, ({ one }) => ({
	user: one(dbUsers, {
		fields: [dbSessions.userId],
		references: [dbUsers.id],
		relationName: 'user-sessions',
	}),
}));

export const dbTenantSessions = mysqlTable(
	'TenantSession',
	{
		id: varchar('id', { length: 191 }).notNull(),
		serverId: snowflake('serverId').notNull(),
		sessionToken: varchar('sessionToken', { length: 191 }).notNull(),
	},
	(table) => {
		return {
			serverIdIdx: index('TenantSession_serverId_idx').on(table.serverId),
			sessionTokenIdx: index('TenantSession_sessionToken_idx').on(
				table.sessionToken,
			),
			tenantSessionId: primaryKey(table.id),
		};
	},
);

export const tenantSessionsRelations = relations(
	dbTenantSessions,
	({ one }) => ({
		server: one(dbServers, {
			fields: [dbTenantSessions.serverId],
			references: [dbServers.id],
		}),
	}),
);

export const dbVerificationTokens = mysqlTable(
	'VerificationToken',
	{
		identifier: varchar('identifier', { length: 191 }).notNull(),
		token: varchar('token', { length: 191 }).notNull(),
		expires: datetime('expires', { mode: 'date', fsp: 3 }).notNull(),
	},
	(table) => {
		return {
			verificationTokenTokenKey: unique('VerificationToken_token_key').on(
				table.token,
			),
			verificationTokenIdentifierTokenKey: unique(
				'VerificationToken_identifier_token_key',
			).on(table.identifier, table.token),
		};
	},
);

export const dbDiscordAccounts = mysqlTable(
	'DiscordAccount',
	{
		id: snowflake('id').notNull(),
		name: varchar('name', { length: 191 }).notNull(),
		avatar: varchar('avatar', { length: 191 }),
	},
	(table) => {
		return {
			discordAccountId: primaryKey(table.id),
			discordAccountIdKey: unique('DiscordAccount_id_key').on(table.id),
		};
	},
);

export type DiscordAccount = typeof dbDiscordAccounts.$inferSelect;
export const discordAccountSchema = createInsertSchema(
	dbDiscordAccounts,
).extend({
	id: z.string(),
});
export const dbUserServerSettings = mysqlTable(
	'UserServerSettings',
	{
		userId: snowflake('userId').notNull(),
		serverId: snowflake('serverId').notNull(),
		bitfield: unsignedInt('bitfield').default(0).notNull(),
		apiKey: varchar('apiKey', { length: 255 }),
		apiCallsUsed: int('apiCallsUsed').default(0).notNull(),
	},
	(table) => {
		return {
			userServerSettingsUserIdServerId: primaryKey(
				table.userId,
				table.serverId,
			),
			userIdIdx: index('UserServerSettings_userId_idx').on(table.userId),
			serverIdIdx: index('UserServerSettings_serverId_idx').on(table.serverId),
			apiKeyIdx: index('UserServerSettings_apiKey_idx').on(table.apiKey),
		};
	},
);
export const userServerSettingsSchema = createInsertSchema(
	dbUserServerSettings,
).extend({
	userId: z.string(),
	serverId: z.string(),
});

export type UserServerSettings = typeof dbUserServerSettings.$inferSelect;

export const userServerSettingsRelations = relations(
	dbUserServerSettings,
	({ one }) => ({
		user: one(dbDiscordAccounts, {
			fields: [dbUserServerSettings.userId],
			references: [dbDiscordAccounts.id],
		}),
		server: one(dbServers, {
			fields: [dbUserServerSettings.serverId],
			references: [dbServers.id],
		}),
	}),
);

export const dbIgnoredDiscordAccounts = mysqlTable(
	'IgnoredDiscordAccount',
	{
		id: snowflake('id').notNull(),
	},
	(table) => {
		return {
			ignoredDiscordAccountId: primaryKey(table.id),
			ignoredDiscordAccountIdKey: unique('IgnoredDiscordAccount_id_key').on(
				table.id,
			),
		};
	},
);
const plans = ['FREE', 'PRO', 'ENTERPRISE', 'OPEN_SOURCE'] as const;
export type Plan = (typeof plans)[number];
export const dbServers = mysqlTable(
	'Server',
	{
		id: snowflake('id').notNull(),
		name: varchar('name', { length: 200 }).notNull(),
		icon: varchar('icon', { length: 45 }),
		description: varchar('description', { length: 191 }),
		vanityInviteCode: varchar('vanityInviteCode', { length: 191 }),
		bitfield: unsignedInt('bitfield').default(0).notNull(),
		kickedTime: datetime('kickedTime', { mode: 'date', fsp: 3 }),
		vanityUrl: varchar('vanityUrl', { length: 191 }),
		customDomain: varchar('customDomain', { length: 191 }),
		stripeCustomerId: varchar('stripeCustomerId', { length: 191 }),
		stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 191 }),
		plan: mysqlEnum('plan', plans).default('FREE').notNull(),
	},
	(table) => {
		return {
			serverId: primaryKey(table.id),
			serverIdKey: unique('Server_id_key').on(table.id),
			serverVanityInviteCodeKey: unique('Server_vanityInviteCode_key').on(
				table.vanityInviteCode,
			),
			serverVanityUrlKey: unique('Server_vanityUrl_key').on(table.vanityUrl),
			serverCustomDomainKey: unique('Server_customDomain_key').on(
				table.customDomain,
			),
			serverStripeCustomerIdKey: unique('Server_stripeCustomerId_key').on(
				table.stripeCustomerId,
			),
			serverStripeSubscriptionIdKey: unique(
				'Server_stripeSubscriptionId_key',
			).on(table.stripeSubscriptionId),
		};
	},
);

export type Server = typeof dbServers.$inferSelect;
export const serverSchema = createInsertSchema(dbServers).extend({
	id: z.string(),
});

// Relations
export const serversRelations = relations(dbServers, ({ many }) => ({
	userServerSettings: many(dbUserServerSettings),
	channels: many(dbChannels),
	tenantSessions: many(dbTenantSessions), //!: pluralised
}));

export const dbChannels = mysqlTable(
	'Channel',
	{
		id: snowflake('id').notNull(),
		serverId: snowflake('serverId').notNull(),
		name: varchar('name', { length: 200 }).notNull(),
		type: int('type').notNull(),
		parentId: snowflake('parentId'),
		inviteCode: varchar('inviteCode', { length: 15 }),
		archivedTimestamp: bigint('archivedTimestamp', { mode: 'bigint' }),
		bitfield: unsignedInt('bitfield').default(0).notNull(),
		solutionTagId: snowflake('solutionTagId'),
		/*
      Instead of looking up the last indexed message in a channel, we're going to store it here
      This allows us to use this as our reference point for where we left off indexing legacy content
      So we can do realtime indexing
     */
		lastIndexedSnowflake: snowflake('lastIndexedSnowflake'),
	},
	(table) => {
		return {
			serverIdIdx: index('Channel_serverId_idx').on(table.serverId),
			parentIdIdx: index('Channel_parentId_idx').on(table.parentId),
			inviteCodeKey: unique('Channel_inviteCode_key').on(table.inviteCode),
			channelId: primaryKey(table.id),
		};
	},
);
export const channelSchema = createInsertSchema(dbChannels).extend({
	id: z.string(),
	serverId: z.string(),
	parentId: z.string().nullable().optional(),
	solutionTagId: z.string().nullable().optional(),
	lastIndexedSnowflake: z.string().nullable().optional(),
});

export type Channel = typeof dbChannels.$inferSelect;

export const channelsRelations = relations(dbChannels, ({ one, many }) => ({
	parent: one(dbChannels, {
		fields: [dbChannels.parentId],
		references: [dbChannels.id],
		relationName: 'parent-child',
	}),
	threads: many(dbChannels, {
		relationName: 'parent-child',
	}),
	server: one(dbServers, {
		fields: [dbChannels.serverId],
		references: [dbServers.id],
	}),
	messages: many(dbMessages),
}));

export const dbAttachments = mysqlTable(
	'Attachment',
	{
		id: varchar('id', { length: 191 }).notNull(),
		messageId: snowflake('messageId').notNull(),
		contentType: varchar('contentType', { length: 191 }),
		filename: varchar('filename', { length: 1024 }).notNull(),
		proxyUrl: varchar('proxyUrl', { length: 1024 }).notNull(), // some of these are really long, need to find what the actual limit is
		url: varchar('url', { length: 1024 }).notNull(),
		width: int('width'),
		height: int('height'),
		size: int('size').notNull(),
		description: varchar('description', { length: 1000 }),
	},
	(table) => {
		return {
			attachmentId: primaryKey(table.id),
			messageIdIdx: index('Attachment_messageId_idx').on(table.messageId),
		};
	},
);

export const attachmentSchema = createInsertSchema(dbAttachments).extend({
	messageId: z.string(),
});

export const dbEmojis = mysqlTable(
	'Emoji',
	{
		id: snowflake('id').notNull(),
		name: varchar('name', { length: 191 }).notNull(),
	},
	(table) => {
		return {
			emojiId: primaryKey(table.id),
		};
	},
);

export const emojiSchema = createInsertSchema(dbEmojis).extend({
	id: z.string(),
});

export const dbReactions = mysqlTable(
	'Reaction',
	{
		messageId: snowflake('messageId').notNull(),
		userId: snowflake('userId').notNull(),
		emojiId: snowflake('emojiId').notNull(),
	},
	(table) => {
		return {
			reactionId: primaryKey(table.messageId, table.userId, table.emojiId),
			messageIdIdx: index('Reaction_messageId_idx').on(table.messageId),
			userIdIdx: index('Reaction_userId_idx').on(table.userId),
			emojiIdIdx: index('Reaction_emojiId_idx').on(table.emojiId),
		};
	},
);
export const reactionSchema = createInsertSchema(dbReactions).extend({
	messageId: z.string(),
	userId: z.string(),
	emojiId: z.string(),
});
export type Embed = {
	title?: string;
	type?: string;
	description?: string;
	url?: string;
	timestamp?: string; // ISO8601 timestamp
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

export const dbMessages = mysqlTable(
	'Message',
	{
		id: snowflake('id').notNull(),

		authorId: snowflake('authorId').notNull(),
		serverId: snowflake('serverId').notNull(),
		channelId: snowflake('channelId').notNull(),
		parentChannelId: snowflake('parentChannelId'),
		childThreadId: snowflake('childThreadId'),

		questionId: snowflake('questionId'),
		referenceId: snowflake('referenceId'),

		applicationId: snowflake('applicationId'),
		interactionId: snowflake('interactionId'),
		webhookId: snowflake('webhookId'),

		// TODO: Optimize not using 2 bools, use bitfield in future
		content: varchar('content', { length: 4100 }).notNull(),
		flags: int('flags'),
		type: int('type'),
		pinned: boolean('pinned'),
		nonce: varchar('nonce', { length: 191 }),
		tts: boolean('tts'),
		embeds: json('embeds').$type<Embed[]>(),
	},
	(table) => {
		return {
			authorIdIdx: index('Message_authorId_idx').on(table.authorId),
			serverIdIdx: index('Message_serverId_idx').on(table.serverId),
			channelIdIdx: index('Message_channelId_idx').on(table.channelId),
			parentChannelIdIdx: index('Message_parentChannelId_idx').on(
				table.parentChannelId,
			),
			childThreadIdIdx: index('Message_childThreadId_idx').on(
				table.childThreadId,
			),
			questionIdIdx: index('Message_questionId_idx').on(table.questionId),
			referenceIdIdx: index('Message_referenceId_idx').on(table.referenceId),
			messageId: primaryKey(table.id),
		};
	},
);
export const messageSchema = createInsertSchema(dbMessages).extend({
	id: z.string(),
	authorId: z.string(),
	serverId: z.string(),
	channelId: z.string(),
	parentChannelId: z.string().nullable().optional(),
	childThreadId: z.string().nullable().optional(),
	questionId: z.string().nullable().optional(),
	referenceId: z.string().nullable().optional(),
	applicationId: z.string().nullable().optional(),
	interactionId: z.string().nullable().optional(),
	webhookId: z.string().nullable().optional(),
});
export const messageRelations = relations(dbMessages, ({ one, many }) => ({
	attachments: many(dbAttachments),
	reactions: many(dbReactions, {
		relationName: 'message-reactions',
	}),
	author: one(dbDiscordAccounts, {
		fields: [dbMessages.authorId],
		references: [dbDiscordAccounts.id],
	}),
	reference: one(dbMessages, {
		fields: [dbMessages.referenceId],
		references: [dbMessages.id],
	}),
	solutions: many(dbMessages, {
		relationName: 'solutions-questions',
	}),
	question: one(dbMessages, {
		fields: [dbMessages.questionId],
		references: [dbMessages.id],
		relationName: 'solutions-questions',
	}),
	server: one(dbServers, {
		fields: [dbMessages.serverId],
		references: [dbServers.id],
	}),
	channel: one(dbChannels, {
		fields: [dbMessages.channelId],
		references: [dbChannels.id],
	}),
}));

export const discordAccountsRelations = relations(
	dbDiscordAccounts,
	({ one, many }) => ({
		account: one(dbAccounts, {
			fields: [dbDiscordAccounts.id],
			references: [dbAccounts.providerAccountId],
		}),
		userServerSettings: many(dbUserServerSettings),
		messages: many(dbMessages),
	}),
);

export const reactionsRelations = relations(dbReactions, ({ one }) => ({
	emoji: one(dbEmojis, {
		fields: [dbReactions.emojiId],
		references: [dbEmojis.id],
	}),
	message: one(dbMessages, {
		fields: [dbReactions.messageId],
		references: [dbMessages.id],
		relationName: 'message-reactions',
	}),
}));

export const attachmentsRelations = relations(dbAttachments, ({ one }) => ({
	message: one(dbMessages, {
		fields: [dbAttachments.messageId],
		references: [dbMessages.id],
	}),
}));

export type BaseMessage = typeof dbMessages.$inferSelect;

export type ReactionWithRelations = typeof dbReactions.$inferSelect & {
	emoji: typeof dbEmojis.$inferSelect;
};

export type BaseMessageWithRelations = BaseMessage & {
	attachments?: (typeof dbAttachments.$inferSelect)[];
	reactions?: ReactionWithRelations[];
};

export type Attachment = typeof dbAttachments.$inferSelect;
