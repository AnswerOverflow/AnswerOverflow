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
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';
const unsignedInt = customType<{
	data: number; // TODO: BigInt?
	// I also tried this ↓ https://orm.drizzle.team/docs/custom-types#examples
	// notNull: true;
	// default: true;
}>({
	dataType() {
		return 'int unsigned';
	},
});

export const users = mysqlTable(
	'User',
	{
		id: varchar('id', { length: 191 }).notNull(),
		name: varchar('name', { length: 191 }),
		email: varchar('email', { length: 191 }),
		emailVerified: datetime('emailVerified', { mode: 'string', fsp: 3 }),
		image: varchar('image', { length: 191 }),
	},
	(table) => {
		return {
			userId: primaryKey(table.id),
			userEmailKey: unique('User_email_key').on(table.email),
		};
	},
);

export type User = typeof users.$inferSelect;

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
}));

export const accounts = mysqlTable(
	'Account',
	{
		id: varchar('id', { length: 191 }).notNull(),
		userId: varchar('userId', { length: 191 }).notNull(),
		type: varchar('type', { length: 191 }).notNull(),
		provider: varchar('provider', { length: 191 }).notNull(),
		providerAccountId: varchar('providerAccountId', { length: 191 }).notNull(),
		refreshToken: varchar('refresh_token', { length: 191 }),
		accessToken: varchar('access_token', { length: 191 }),
		expiresAt: int('expires_at'),
		tokenType: varchar('token_type', { length: 191 }),
		scope: varchar('scope', { length: 191 }),
		idToken: varchar('id_token', { length: 191 }),
		sessionState: varchar('session_state', { length: 191 }),
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

export type Account = typeof accounts.$inferSelect;

export const accountRelations = relations(accounts, ({ one }) => ({
	user: one(users, {
		fields: [accounts.userId],
		references: [users.id],
	}),
	discordAccount: one(discordAccounts, {
		fields: [accounts.providerAccountId],
		references: [discordAccounts.id],
	}),
}));

export const sessions = mysqlTable(
	'Session',
	{
		id: varchar('id', { length: 191 }).notNull(),
		sessionToken: varchar('sessionToken', { length: 191 }).notNull(),
		userId: varchar('userId', { length: 191 }).notNull(),
		expires: datetime('expires', { mode: 'string', fsp: 3 }).notNull(),
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

export const tenantSessions = mysqlTable(
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

export const tenantSessionsRelations = relations(tenantSessions, ({ one }) => ({
	server: one(servers, {
		fields: [tenantSessions.serverId],
		references: [servers.id],
	}),
}));

export const verificationTokens = mysqlTable(
	'VerificationToken',
	{
		identifier: varchar('identifier', { length: 191 }).notNull(),
		token: varchar('token', { length: 191 }).notNull(),
		expires: datetime('expires', { mode: 'string', fsp: 3 }).notNull(),
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

export const discordAccounts = mysqlTable(
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

export type DiscordAccount = typeof discordAccounts.$inferSelect;

export const discordAccountsRelations = relations(
	discordAccounts,
	({ one, many }) => ({
		account: one(accounts, {
			fields: [discordAccounts.id],
			references: [accounts.providerAccountId],
		}),
		userServerSettings: many(userServerSettings),
	}),
);

export const userServerSettings = mysqlTable(
	'UserServerSettings',
	{
		userId: varchar('userId', { length: 191 }).notNull(),
		serverId: varchar('serverId', { length: 191 }).notNull(),
		bitfield: unsignedInt('bitfield').default(0).notNull(),
	},
	(table) => {
		return {
			userIdIdx: index('UserServerSettings_userId_idx').on(table.userId),
			serverIdIdx: index('UserServerSettings_serverId_idx').on(table.serverId),
			userServerSettingsServerIdUserId: primaryKey(
				table.serverId,
				table.userId,
			),
		};
	},
);

export type UserServerSettings = typeof userServerSettings.$inferSelect;

export const userServerSettingsRelations = relations(
	userServerSettings,
	({ one }) => ({
		user: one(discordAccounts, {
			fields: [userServerSettings.userId],
			references: [discordAccounts.id],
		}),
		server: one(servers, {
			fields: [userServerSettings.serverId],
			references: [servers.id],
		}),
	}),
);

export const ignoredDiscordAccounts = mysqlTable(
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

export const servers = mysqlTable(
	'Server',
	{
		id: varchar('id', { length: 191 }).notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		icon: varchar('icon', { length: 45 }),
		description: varchar('description', { length: 191 }),
		vanityInviteCode: varchar('vanityInviteCode', { length: 191 }),
		bitfield: unsignedInt('bitfield').default(0).notNull(),
		kickedTime: datetime('kickedTime', { mode: 'string', fsp: 3 }),
		vanityUrl: varchar('vanityUrl', { length: 191 }),
		customDomain: varchar('customDomain', { length: 191 }),
		stripeCustomerId: varchar('stripeCustomerId', { length: 191 }),
		stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 191 }),
		plan: mysqlEnum('plan', ['FREE', 'PRO', 'ENTERPRISE', 'OPEN_SOURCE'])
			.default('FREE')
			.notNull(),
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

export type Server = typeof servers.$inferSelect;

// Relations
export const serversRelations = relations(servers, ({ many }) => ({
	userServerSettings: many(userServerSettings),
	channels: many(channels),
	tenantSessions: many(tenantSessions), //!: pluralised
}));

export const channels = mysqlTable(
	'Channel',
	{
		id: varchar('id', { length: 191 }).notNull(),
		serverId: varchar('serverId', { length: 191 }).notNull(),
		name: varchar('name', { length: 100 }).notNull(),
		type: int('type').notNull(),
		parentId: varchar('parentId', { length: 191 }),
		inviteCode: varchar('inviteCode', { length: 15 }),
		archivedTimestamp: bigint('archivedTimestamp', { mode: 'number' }),
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

export type Channel = typeof channels.$inferSelect;

export const channelsRelations = relations(channels, ({ one, many }) => ({
	parent: one(channels, {
		fields: [channels.parentId],
		references: [channels.id],
	}),
	threads: many(channels),
	server: one(servers, {
		fields: [channels.serverId],
		references: [servers.id],
	}),
}));
