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
import { relations, sql } from 'drizzle-orm';
const unsignedInt = customType<{
	data: number; // TODO: BigInt?
}>({
	dataType() {
		return 'int unsigned';
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
	sessions: many(dbSessions),
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

export const dbTenantSessions = mysqlTable(
	'TenantSession',
	{
		id: varchar('id', { length: 191 }).notNull(),
		serverId: varchar('serverId', { length: 191 }).notNull(),
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
		id: varchar('id', { length: 191 }).notNull(),
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

export const dbUserServerSettings = mysqlTable(
	'UserServerSettings',
	{
		userId: varchar('userId', { length: 191 }).notNull(),
		serverId: varchar('serverId', { length: 191 }).notNull(),
		bitfield: unsignedInt('bitfield').default(0).notNull(),
	},
	(table) => {
		return {
			userIdIdx: index('UserServerSettings_userId_idx').on(table.userId),
			userServerSettingsUserIdServerId: primaryKey(
				table.userId,
				table.serverId,
			),
			serverIdIdx: index('UserServerSettings_serverId_idx').on(table.serverId),
		};
	},
);

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
		id: varchar('id', { length: 191 }).notNull(),
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
		id: varchar('id', { length: 191 }).notNull(),
		name: varchar('name', { length: 100 }).notNull(),
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

// Relations
export const serversRelations = relations(dbServers, ({ many }) => ({
	userServerSettings: many(dbUserServerSettings),
	channels: many(dbChannels),
	tenantSessions: many(dbTenantSessions), //!: pluralised
}));

export const dbChannels = mysqlTable(
	'Channel',
	{
		id: varchar('id', { length: 191 }).notNull(),
		serverId: varchar('serverId', { length: 191 }).notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		type: int('type').notNull(),
		parentId: varchar('parentId', { length: 191 }),
		inviteCode: varchar('inviteCode', { length: 15 }),
		archivedTimestamp: bigint('archivedTimestamp', { mode: 'bigint' }),
		bitfield: unsignedInt('bitfield').default(0).notNull(),
		solutionTagId: varchar('solutionTagId', { length: 191 }),
	},
	(table) => {
		return {
			serverIdIdx: index('Channel_serverId_idx').on(table.serverId),
			parentIdIdx: index('Channel_parentId_idx').on(table.parentId),
			channelId: primaryKey(table.id),
			channelInviteCodeKey: unique('Channel_inviteCode_key').on(
				table.inviteCode,
			),
		};
	},
);

export type Channel = typeof dbChannels.$inferSelect;

export const channelsRelations = relations(dbChannels, ({ one, many }) => ({
	parent: one(dbChannels, {
		fields: [dbChannels.parentId],
		references: [dbChannels.id],
	}),
	threads: many(dbChannels),
	server: one(dbServers, {
		fields: [dbChannels.serverId],
		references: [dbServers.id],
	}),
}));

export const dbAttachments = mysqlTable(
	'Attachment',
	{
		id: varchar('id', { length: 191 }).notNull(),
		messageId: varchar('messageId', { length: 191 }).notNull(),
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
		};
	},
);

export const dbEmojis = mysqlTable(
	'Emoji',
	{
		id: varchar('id', { length: 191 }).notNull(),
		name: varchar('name', { length: 191 }).notNull(),
	},
	(table) => {
		return {
			emojiId: primaryKey(table.id),
		};
	},
);

export const dbReactions = mysqlTable(
	'Reaction',
	{
		messageId: varchar('messageId', { length: 191 }).notNull(),
		userId: varchar('userId', { length: 191 }).notNull(),
		emojiId: varchar('emojiId', { length: 191 }).notNull(),
	},
	(table) => {
		return {
			reactionId: primaryKey(table.messageId, table.userId, table.emojiId),
		};
	},
);

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
		id: varchar('id', { length: 191 }).notNull(),

		authorId: varchar('authorId', { length: 191 }).notNull(),
		serverId: varchar('serverId', { length: 191 }).notNull(),
		channelId: varchar('channelId', { length: 191 }).notNull(),
		parentChannelId: varchar('parentChannelId', { length: 191 }),
		childThreadId: varchar('childThreadId', { length: 191 }),

		questionId: varchar('questionId', { length: 191 }),
		referenceId: varchar('referenceId', { length: 191 }),

		applicationId: varchar('applicationId', { length: 191 }),
		interactionId: varchar('interactionId', { length: 191 }),
		webhookId: varchar('webhookId', { length: 191 }),

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
			messageId: primaryKey(table.id),
		};
	},
);

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
