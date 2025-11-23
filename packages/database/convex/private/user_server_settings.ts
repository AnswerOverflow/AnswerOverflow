import { type Infer, v } from "convex/values";
import { getManyFrom } from "convex-helpers/server/relationships";
import { privateMutation, privateQuery } from "../client";
import { userServerSettingsSchema } from "../schema";
import { assertIsUser, getDiscordAccountIdFromAuth } from "../shared/auth";
import type { AuthorizedUser, IsAuthenticated } from "../shared/permissions";
import {
	deleteMessageInternalLogic,
	findUserServerSettingsById as findUserServerSettingsByIdShared,
} from "../shared/shared";

type UserServerSettings = Infer<typeof userServerSettingsSchema>;

export const findUserServerSettingsById = privateQuery({
	args: {
		userId: v.string(),
		serverId: v.string(),
	},
	handler: async (ctx, args) => {
		return await findUserServerSettingsByIdShared(
			ctx,
			args.userId,
			args.serverId,
		);
	},
});

export const findManyUserServerSettings = privateQuery({
	args: {
		settings: v.array(
			v.object({
				userId: v.string(),
				serverId: v.string(),
			}),
		),
	},
	handler: async (ctx, args) => {
		if (args.settings.length === 0) return [];

		const uniqueUserIds = new Set(args.settings.map((s) => s.userId));
		const serverIds = new Set(args.settings.map((s) => s.serverId));

		if (uniqueUserIds.size === 1) {
			const userIdArray = Array.from(uniqueUserIds);
			if (userIdArray.length === 0) {
				return [];
			}
			const userId = userIdArray[0];
			if (!userId) {
				return [];
			}
			const allUserSettings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_userId",
				userId,
			);

			const filtered = allUserSettings.filter((setting) =>
				serverIds.has(setting.serverId),
			);
			return filtered;
		}

		const results: UserServerSettings[] = [];
		for (const setting of args.settings) {
			const userSettings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_userId",
				setting.userId,
			);
			const found = userSettings.find((s) => s.serverId === setting.serverId);
			if (found) {
				results.push(found);
			}
		}
		return results;
	},
});

export const findUserServerSettingsByApiKey = privateQuery({
	args: {
		apiKey: v.string(),
	},
	handler: async (ctx, args) => {
		const allSettings = await ctx.db.query("userServerSettings").collect();
		return allSettings.find((s) => s.apiKey === args.apiKey) ?? null;
	},
});

export const updateUserServerSettings = privateMutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		const _authorizedUser: AuthorizedUser<IsAuthenticated> = assertIsUser(
			discordAccountId,
			args.settings.userId,
		);

		const userSettings = await getManyFrom(
			ctx.db,
			"userServerSettings",
			"by_userId",
			args.settings.userId,
		);
		const existing = userSettings.find(
			(s) => s.serverId === args.settings.serverId,
		);

		if (!existing) {
			throw new Error("UserServerSettings not found");
		}

		if (
			args.settings.canPubliclyDisplayMessages &&
			args.settings.messageIndexingDisabled
		) {
			throw new Error(
				"You cannot grant consent to publicly display messages with message indexing disabled. Enable messaging indexing first",
			);
		}

		const updatedSettings = { ...args.settings };
		if (updatedSettings.messageIndexingDisabled) {
			updatedSettings.canPubliclyDisplayMessages = false;
		}

		if (
			updatedSettings.messageIndexingDisabled &&
			!existing.messageIndexingDisabled
		) {
			const allMessages = await getManyFrom(
				ctx.db,
				"messages",
				"by_authorId",
				args.settings.userId,
			);
			const messages = allMessages.filter(
				(m) => m.serverId === args.settings.serverId,
			);

			for (const message of messages) {
				await deleteMessageInternalLogic(ctx, message.id);
			}
		}

		await ctx.db.patch(existing._id, updatedSettings);

		const updatedUserSettings = await getManyFrom(
			ctx.db,
			"userServerSettings",
			"by_userId",
			args.settings.userId,
			"userId",
		);
		const updated = updatedUserSettings.find(
			(s) => s.serverId === args.settings.serverId,
		);

		if (!updated) {
			throw new Error("Failed to update user server settings");
		}

		return updated;
	},
});

export const upsertUserServerSettings = privateMutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		const _authorizedUser: AuthorizedUser<IsAuthenticated> = assertIsUser(
			discordAccountId,
			args.settings.userId,
		);

		const userSettings = await getManyFrom(
			ctx.db,
			"userServerSettings",
			"by_userId",
			args.settings.userId,
		);
		const existing = userSettings.find(
			(s) => s.serverId === args.settings.serverId,
		);

		if (existing) {
			const updatedSettings = { ...args.settings };
			if (updatedSettings.messageIndexingDisabled) {
				updatedSettings.canPubliclyDisplayMessages = false;
			}

			if (
				updatedSettings.messageIndexingDisabled &&
				!existing.messageIndexingDisabled
			) {
				const allMessages = await getManyFrom(
					ctx.db,
					"messages",
					"by_authorId",
					args.settings.userId,
				);
				const messages = allMessages.filter(
					(m) => m.serverId === args.settings.serverId,
				);

				for (const message of messages) {
					await deleteMessageInternalLogic(ctx, message.id);
				}
			}

			await ctx.db.patch(existing._id, updatedSettings);
			const updatedUserSettings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_userId",
				args.settings.userId,
			);
			const updated = updatedUserSettings.find(
				(s) => s.serverId === args.settings.serverId,
			);
			if (!updated) {
				throw new Error("Failed to update user server settings");
			}
			return updated;
		} else {
			const newSettings = { ...args.settings };
			if (newSettings.messageIndexingDisabled) {
				newSettings.canPubliclyDisplayMessages = false;
			}

			await ctx.db.insert("userServerSettings", newSettings);
			const createdUserSettings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_userId",
				args.settings.userId,
			);
			const created = createdUserSettings.find(
				(s) => s.serverId === args.settings.serverId,
			);
			if (!created) {
				throw new Error("Failed to create user server settings");
			}
			return created;
		}
	},
});

export const deleteUserServerSettingsByUserId = privateMutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		const _authorizedUser: AuthorizedUser<IsAuthenticated> = assertIsUser(
			discordAccountId,
			args.userId,
		);

		const settings = await getManyFrom(
			ctx.db,
			"userServerSettings",
			"by_userId",
			args.userId,
		);

		for (const setting of settings) {
			await ctx.db.delete(setting._id);
		}

		return null;
	},
});

export const upsertUserServerSettingsInternal = privateMutation({
	args: {
		settings: userServerSettingsSchema,
	},
	handler: async (ctx, args) => {
		const userSettings = await getManyFrom(
			ctx.db,
			"userServerSettings",
			"by_userId",
			args.settings.userId,
		);
		const existing = userSettings.find(
			(s) => s.serverId === args.settings.serverId,
		);

		if (existing) {
			const updatedSettings = { ...args.settings };
			if (updatedSettings.messageIndexingDisabled) {
				updatedSettings.canPubliclyDisplayMessages = false;
			}

			if (
				updatedSettings.messageIndexingDisabled &&
				!existing.messageIndexingDisabled
			) {
				const allMessages = await getManyFrom(
					ctx.db,
					"messages",
					"by_authorId",
					args.settings.userId,
				);
				const messages = allMessages.filter(
					(m) => m.serverId === args.settings.serverId,
				);

				for (const message of messages) {
					await deleteMessageInternalLogic(ctx, message.id);
				}
			}

			await ctx.db.patch(existing._id, updatedSettings);
			const updatedUserSettings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_userId",
				args.settings.userId,
			);
			const updated = updatedUserSettings.find(
				(s) => s.serverId === args.settings.serverId,
			);
			if (!updated) {
				throw new Error("Failed to update user server settings");
			}
			return updated;
		} else {
			const newSettings = { ...args.settings };
			if (newSettings.messageIndexingDisabled) {
				newSettings.canPubliclyDisplayMessages = false;
			}

			await ctx.db.insert("userServerSettings", newSettings);
			const createdUserSettings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_userId",
				args.settings.userId,
			);
			const created = createdUserSettings.find(
				(s) => s.serverId === args.settings.serverId,
			);
			if (!created) {
				throw new Error("Failed to create user server settings");
			}
			return created;
		}
	},
});

export const countConsentingUsersInServer = privateQuery({
	args: {
		serverId: v.string(),
	},
	handler: async (ctx, args) => {
		const settings = await ctx.db
			.query("userServerSettings")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.collect();

		return settings.filter(
			(setting) => setting.canPubliclyDisplayMessages === true,
		).length;
	},
});

export const countConsentingUsersInManyServers = privateQuery({
	args: {
		serverIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.serverIds.length === 0) return [];

		const results: Array<{ serverId: string; count: number }> = [];

		for (const serverId of args.serverIds) {
			const settings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_serverId",
				serverId,
			);

			const count = settings.filter(
				(setting) => setting.canPubliclyDisplayMessages === true,
			).length;

			results.push({ serverId, count });
		}

		return results;
	},
});
