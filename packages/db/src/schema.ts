import {
	int,
	timestamp,
	mysqlTable,
	primaryKey,
	varchar,
	datetime,
	mysqlEnum,
	bigint,
} from 'drizzle-orm/mysql-core';
import type { AdapterAccount } from '@auth/core/adapters';
import { relations } from 'drizzle-orm';

export const users = mysqlTable('User', {
	id: varchar('id', { length: 255 }).notNull().primaryKey(),
	name: varchar('name', { length: 255 }),
	email: varchar('email', { length: 255 }),
	emailVerified: timestamp('emailVerified', {
		mode: 'date',
		fsp: 3,
	}).defaultNow(),
	image: varchar('image', { length: 255 }),
});

export type User = typeof users.$inferSelect;

export const usersRelations = relations(users, ({ many }) => ({
	accounts: many(accounts),
	sessions: many(sessions),
}));

export const accounts = mysqlTable(
	'Account',
	{
		id: varchar('id', { length: 255 }).notNull().primaryKey(),
		userId: varchar('userId', { length: 255 })
			.notNull()
			.references(() => users.id, { onDelete: 'cascade' }),
		type: varchar('type', { length: 255 })
			.$type<AdapterAccount['type']>()
			.notNull(),
		provider: varchar('provider', { length: 255 }).notNull(),
		providerAccountId: varchar('providerAccountId', { length: 255 }).notNull(),
		refresh_token: varchar('refresh_token', { length: 255 }),
		access_token: varchar('access_token', { length: 255 }),
		expires_at: int('expires_at'),
		token_type: varchar('token_type', { length: 255 }),
		scope: varchar('scope', { length: 255 }),
		id_token: varchar('id_token', { length: 255 }),
		session_state: varchar('session_state', { length: 255 }),
	},
	(account) => ({
		compoundKey: primaryKey(account.provider, account.providerAccountId),
	}),
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

export const sessions = mysqlTable('Session', {
	sessionToken: varchar('sessionToken', { length: 255 }).notNull().primaryKey(),
	userId: varchar('userId', { length: 255 })
		.notNull()
		.references(() => users.id, { onDelete: 'cascade' }),
	expires: timestamp('expires', { mode: 'date' }).notNull(),
});

export const tenantSessions = mysqlTable('TenantSession', {
	id: varchar('id', { length: 255 }).notNull().primaryKey(),
	serverId: varchar('serverId', { length: 255 }).notNull(),
	sessionToken: varchar('sessionToken', { length: 255 }).notNull(),
});

export const tenantSessionsRelations = relations(tenantSessions, ({ one }) => ({
	server: one(servers, {
		fields: [tenantSessions.serverId],
		references: [servers.id],
	}),
}));

export const verificationTokens = mysqlTable(
	'VerificationToken',
	{
		identifier: varchar('identifier', { length: 255 }).notNull(),
		token: varchar('token', { length: 255 }).notNull(),
		expires: timestamp('expires', { mode: 'date' }).notNull(),
	},
	(vt) => ({
		compoundKey: primaryKey(vt.identifier, vt.token),
	}),
);

export const discordAccounts = mysqlTable('DiscordAccount', {
	id: varchar('id', { length: 255 }).notNull().primaryKey().unique(),
	name: varchar('name', { length: 255 }).notNull(),
	avatar: varchar('avatar', { length: 255 }),
});

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

export const userServerSettings = mysqlTable('UserServerSettings', {
	userId: varchar('userId', { length: 255 }).notNull(),
	serverId: varchar('serverId', { length: 255 }).notNull(),
	bitfield: int('bitfield').default(0).notNull(),
});

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

export const ignoredDiscordAccounts = mysqlTable('IgnoredDiscordAccount', {
	id: varchar('id', { length: 255 }).notNull().primaryKey(),
});

export const servers = mysqlTable('Server', {
	id: varchar('id', { length: 255 }).notNull().primaryKey(),
	name: varchar('name', { length: 255 }).notNull(),
	icon: varchar('icon', { length: 255 }),
	description: varchar('description', { length: 255 }),
	vanityInviteCode: varchar('vanityInviteCode', { length: 255 }).unique(),

	//
	// Answer Overflow Settings Start
	//
	bitfield: int('bitfield').default(0).notNull(),
	kickedTime: datetime('kickedTime'),
	vanityUrl: varchar('vanityUrl', { length: 255 }).unique(),

	// Tenant Settings
	customDomain: varchar('customDomain', { length: 255 }).unique(),

	// Stripe Settings
	stripeCustomerId: varchar('stripeCustomerId', { length: 255 }),
	stripeSubscriptionId: varchar('stripeSubscriptionId', { length: 255 }),
	plan: mysqlEnum('plan', ['FREE', 'PRO', 'ENTERPRISE', 'OPEN_SOURCE']).default(
		'FREE',
	),

	//
	// Answer Overflow Settings End
	//
});

export type Server = typeof servers.$inferSelect;

// Relations
export const serversRelations = relations(servers, ({ many }) => ({
	userServerSettings: many(userServerSettings),
	channels: many(channels),
	tenantSessions: many(tenantSessions), //!: pluralised
}));

export const channels = mysqlTable('Channel', {
	id: varchar('id', { length: 255 }).notNull().primaryKey(),
	serverId: varchar('serverId', { length: 255 }).notNull(),
	name: varchar('name', { length: 100 }).notNull(),
	type: int('type').notNull(),
	parentId: varchar('parentId', { length: 255 }),
	inviteCode: varchar('inviteCode', { length: 15 }).unique(),
	archivedTimestamp: bigint('archivedTimestamp', { mode: 'bigint' }),

	// Answer Overflow Settings
	bitfield: int('bitfield').default(0).notNull(),
	solutionTagId: varchar('solutionTagId', { length: 255 }),
});

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
