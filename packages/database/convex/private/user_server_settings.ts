import { type Infer, v } from "convex/values";
import { getManyFrom } from "convex-helpers/server/relationships";
import { privateMutation, privateQuery } from "../client";
import { userServerSettingsSchema } from "../schema";
import {
	deleteMessageInternalLogic,
	findUserServerSettingsById as findUserServerSettingsByIdShared,
} from "../shared/shared";

type UserServerSettings = Infer<typeof userServerSettingsSchema>;

export const findUserServerSettingsById = privateQuery({
	args: {
		userId: v.int64(),
		serverId: v.int64(),
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
				userId: v.int64(),
				serverId: v.int64(),
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

export const upsertUserServerSettings = privateMutation({
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

export const upsertManyBotUserServerSettings = privateMutation({
	args: {
		settings: v.array(userServerSettingsSchema),
	},
	handler: async (ctx, args) => {
		if (args.settings.length === 0) return [];

		for (const setting of args.settings) {
			const userSettings = await getManyFrom(
				ctx.db,
				"userServerSettings",
				"by_userId",
				setting.userId,
			);
			const existing = userSettings.find(
				(s) => s.serverId === setting.serverId,
			);

			if (existing) {
				await ctx.db.patch(existing._id, setting);
			} else {
				await ctx.db.insert("userServerSettings", setting);
			}
		}

		return args.settings;
	},
});

export const upsertManyUserServerSettings = privateMutation({
	args: {
		settings: v.array(userServerSettingsSchema),
	},
	handler: async (ctx, args) => {
		for (const setting of args.settings) {
			try {
				await ctx.db.insert("userServerSettings", setting);
			} catch (_e) {
				const existing = await findUserServerSettingsByIdShared(
					ctx,
					setting.userId,
					setting.serverId,
				);
				if (!existing) {
					return null;
				}
				await ctx.db.replace(existing._id, setting);
			}
		}
	},
});
