import { type Infer, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { assertIsUser, getDiscordAccountIdFromAuth } from "./auth";
import type { AuthorizedUser, IsAuthenticated } from "./permissions";
import { userServerSettingsSchema } from "./schema";
import {
	deleteMessageInternalLogic,
	deleteUserServerSettingsByUserIdLogic,
	findUserServerSettingsById as findUserServerSettingsByIdShared,
} from "./shared";

type UserServerSettings = Infer<typeof userServerSettingsSchema>;

export const findUserServerSettingsById = query({
	args: {
		userId: v.string(),
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		return await findUserServerSettingsByIdShared(ctx, args.userId, args.serverId);
	},
});

export const findManyUserServerSettings = query({
	args: {
		settings: v.array(
			v.object({
				userId: v.string(),
				serverId: v.id("servers"),
			}),
		),
	},
	handler: async (ctx, args) => {
		if (args.settings.length === 0) return [];

		const results: UserServerSettings[] = [];
		for (const setting of args.settings) {
			const found = await ctx.db
				.query("userServerSettings")
				.withIndex("by_userId", (q) => q.eq("userId", setting.userId))
				.filter((q) => q.eq(q.field("serverId"), setting.serverId))
				.first();
			if (found) {
				results.push(found);
			}
		}
		return results;
	},
});

export const findUserServerSettingsByApiKey = query({
	args: {
		apiKey: v.string(),
	},
	handler: async (ctx, args) => {
		// Note: We need to scan all user server settings since there's no index on apiKey
		// In production, you might want to add an index
		const allSettings = await ctx.db.query("userServerSettings").collect();
		return allSettings.find((s) => s.apiKey === args.apiKey) ?? null;
	},
});

export const createUserServerSettings = mutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<IsAuthenticated> = assertIsUser(
			discordAccountId,
			args.settings.userId,
		);

		// Check if already exists
		const existing = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (existing) {
			throw new Error("UserServerSettings already exists");
		}

		await ctx.db.insert("userServerSettings", args.settings);

		const created = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (!created) {
			throw new Error("Failed to create user server settings");
		}

		return created;
	},
});

export const updateUserServerSettings = mutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<IsAuthenticated> = assertIsUser(
			discordAccountId,
			args.settings.userId,
		);

		const existing = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (!existing) {
			throw new Error("UserServerSettings not found");
		}

		// Validate: Cannot grant consent to publicly display messages with message indexing disabled
		if (
			args.settings.canPubliclyDisplayMessages &&
			args.settings.messageIndexingDisabled
		) {
			throw new Error(
				"You cannot grant consent to publicly display messages with message indexing disabled. Enable messaging indexing first",
			);
		}

		// If disabling message indexing, remove consent to publicly display messages
		const updatedSettings = { ...args.settings };
		if (updatedSettings.messageIndexingDisabled) {
			updatedSettings.canPubliclyDisplayMessages = false;
		}

		// If we're disabling message indexing and it wasn't disabled before, delete all messages
		if (
			updatedSettings.messageIndexingDisabled &&
			!existing.messageIndexingDisabled
		) {
			const messages = await ctx.db
				.query("messages")
				.withIndex("by_authorId", (q) => q.eq("authorId", args.settings.userId))
				.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
				.collect();

			for (const message of messages) {
				await deleteMessageInternalLogic(ctx, message.id);
			}
		}

		await ctx.db.patch(existing._id, updatedSettings);

		const updated = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (!updated) {
			throw new Error("Failed to update user server settings");
		}

		return updated;
	},
});

export const upsertUserServerSettings = mutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<IsAuthenticated> = assertIsUser(
			discordAccountId,
			args.settings.userId,
		);

		const existing = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (existing) {
			// Update existing
			const updatedSettings = { ...args.settings };
			if (updatedSettings.messageIndexingDisabled) {
				updatedSettings.canPubliclyDisplayMessages = false;
			}

			if (
				updatedSettings.messageIndexingDisabled &&
				!existing.messageIndexingDisabled
			) {
				const messages = await ctx.db
					.query("messages")
					.withIndex("by_authorId", (q) =>
						q.eq("authorId", args.settings.userId),
					)
					.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
					.collect();

				for (const message of messages) {
					await deleteMessageInternalLogic(ctx, message.id);
				}
			}

			await ctx.db.patch(existing._id, updatedSettings);
			const updated = await ctx.db
				.query("userServerSettings")
				.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
				.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
				.first();
			if (!updated) {
				throw new Error("Failed to update user server settings");
			}
			return updated;
		} else {
			// Create new
			const newSettings = { ...args.settings };
			if (newSettings.messageIndexingDisabled) {
				newSettings.canPubliclyDisplayMessages = false;
			}

			await ctx.db.insert("userServerSettings", newSettings);
			const created = await ctx.db
				.query("userServerSettings")
				.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
				.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
				.first();
			if (!created) {
				throw new Error("Failed to create user server settings");
			}
			return created;
		}
	},
});

export const increaseApiKeyUsage = mutation({
	args: {
		apiKey: v.string(),
	},
	handler: async (ctx, args) => {
		const settings = await ctx.db.query("userServerSettings").collect();
		const target = settings.find((s) => s.apiKey === args.apiKey);

		if (target) {
			await ctx.db.patch(target._id, {
				apiCallsUsed: target.apiCallsUsed + 1,
			});
		}

		return null;
	},
});

export const deleteUserServerSettingsByUserId = mutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		// Check authentication and authorization
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<IsAuthenticated> = assertIsUser(
			discordAccountId,
			args.userId,
		);

		const settings = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.userId))
			.collect();

		for (const setting of settings) {
			await ctx.db.delete(setting._id);
		}

		return null;
	},
});

export const deleteUserServerSettingsByUserIdInternal = internalMutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteUserServerSettingsByUserIdLogic(ctx, args.userId);
		return null;
	},
});

// Internal mutations for testing (bypass authentication)
export const createUserServerSettingsInternal = internalMutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (existing) {
			throw new Error("UserServerSettings already exists");
		}

		await ctx.db.insert("userServerSettings", args.settings);

		const created = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (!created) {
			throw new Error("Failed to create user server settings");
		}

		return created;
	},
});

export const updateUserServerSettingsInternal = internalMutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (!existing) {
			throw new Error("UserServerSettings not found");
		}

		// Validate: Cannot grant consent to publicly display messages with message indexing disabled
		if (
			args.settings.canPubliclyDisplayMessages &&
			args.settings.messageIndexingDisabled
		) {
			throw new Error(
				"You cannot grant consent to publicly display messages with message indexing disabled. Enable messaging indexing first",
			);
		}

		// If disabling message indexing, remove consent to publicly display messages
		const updatedSettings = { ...args.settings };
		if (updatedSettings.messageIndexingDisabled) {
			updatedSettings.canPubliclyDisplayMessages = false;
		}

		// If we're disabling message indexing and it wasn't disabled before, delete all messages
		if (
			updatedSettings.messageIndexingDisabled &&
			!existing.messageIndexingDisabled
		) {
			const messages = await ctx.db
				.query("messages")
				.withIndex("by_authorId", (q) => q.eq("authorId", args.settings.userId))
				.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
				.collect();

			for (const message of messages) {
				await deleteMessageInternalLogic(ctx, message.id);
			}
		}

		await ctx.db.patch(existing._id, updatedSettings);

		const updated = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (!updated) {
			throw new Error("Failed to update user server settings");
		}

		return updated;
	},
});

export const upsertUserServerSettingsInternal = internalMutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		const existing = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
			.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
			.first();

		if (existing) {
			// Update existing
			const updatedSettings = { ...args.settings };
			if (updatedSettings.messageIndexingDisabled) {
				updatedSettings.canPubliclyDisplayMessages = false;
			}

			if (
				updatedSettings.messageIndexingDisabled &&
				!existing.messageIndexingDisabled
			) {
				const messages = await ctx.db
					.query("messages")
					.withIndex("by_authorId", (q) =>
						q.eq("authorId", args.settings.userId),
					)
					.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
					.collect();

				for (const message of messages) {
					await deleteMessageInternalLogic(ctx, message.id);
				}
			}

			await ctx.db.patch(existing._id, updatedSettings);
			const updated = await ctx.db
				.query("userServerSettings")
				.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
				.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
				.first();
			if (!updated) {
				throw new Error("Failed to update user server settings");
			}
			return updated;
		} else {
			// Create new
			const newSettings = { ...args.settings };
			if (newSettings.messageIndexingDisabled) {
				newSettings.canPubliclyDisplayMessages = false;
			}

			await ctx.db.insert("userServerSettings", newSettings);
			const created = await ctx.db
				.query("userServerSettings")
				.withIndex("by_userId", (q) => q.eq("userId", args.settings.userId))
				.filter((q) => q.eq(q.field("serverId"), args.settings.serverId))
				.first();
			if (!created) {
				throw new Error("Failed to create user server settings");
			}
			return created;
		}
	},
});

export const countConsentingUsersInServer = query({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const settings = await ctx.db
			.query("userServerSettings")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.collect();

		// Count users who have canPubliclyDisplayMessages enabled
		return settings.filter(
			(setting) => setting.canPubliclyDisplayMessages === true,
		).length;
	},
});

export const countConsentingUsersInManyServers = query({
	args: {
		serverIds: v.array(v.id("servers")),
	},
	handler: async (ctx, args) => {
		if (args.serverIds.length === 0) return [];

		const results: Array<{ serverId: Id<"servers">; count: number }> = [];

		for (const serverId of args.serverIds) {
			const settings = await ctx.db
				.query("userServerSettings")
				.withIndex("by_serverId", (q) => q.eq("serverId", serverId))
				.collect();

			const count = settings.filter(
				(setting) => setting.canPubliclyDisplayMessages === true,
			).length;

			results.push({ serverId, count });
		}

		return results;
	},
});
