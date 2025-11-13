import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { type Infer, v } from "convex/values";
import { getManyFrom } from "convex-helpers/server/relationships";
import { Effect } from "effect";
import type { Id } from "../_generated/dataModel";
import { internalMutation } from "../client";
import { publicInternalMutation, publicInternalQuery } from "../client";
import { userServerSettingsSchema } from "../schema";
import { assertIsUser, getDiscordAccountIdFromAuth } from "../shared/auth";
import type { AuthorizedUser, IsAuthenticated } from "../shared/permissions";
import {
	deleteMessageInternalLogic,
	deleteUserServerSettingsByUserIdLogic,
	findUserServerSettingsById as findUserServerSettingsByIdShared,
} from "../shared/shared";

type UserServerSettings = Infer<typeof userServerSettingsSchema>;

export const findUserServerSettingsById = publicInternalQuery({
	args: {
		userId: v.string(),
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		return await findUserServerSettingsByIdShared(
			ctx,
			args.userId,
			args.serverId,
		);
	},
});

export const findManyUserServerSettings = publicInternalQuery({
	args: {
		settings: v.array(
			v.object({
				userId: v.string(),
				serverId: v.id("servers"),
			}),
		),
	},
	handler: async (ctx, args) => {
		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan(
				"user_server_settings.findManyUserServerSettings",
			)(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"convex.function": "findManyUserServerSettings",
						"settings.count": args.settings.length,
					});
					if (args.settings.length === 0) return [];

					// Optimization: If all settings have the same userId, we can query once and filter
					// This reduces N queries to 1 query + filtering
					const uniqueUserIds = new Set(args.settings.map((s) => s.userId));
					const serverIds = new Set(args.settings.map((s) => s.serverId));

					yield* Effect.annotateCurrentSpan({
						"settings.uniqueUsers": uniqueUserIds.size,
						"settings.uniqueServers": serverIds.size,
						"settings.optimized": uniqueUserIds.size === 1,
					});

					// If we have multiple userIds, fall back to the original approach
					// Otherwise, optimize by querying all settings for the user and filtering
					if (uniqueUserIds.size === 1) {
						const userIdArray = Array.from(uniqueUserIds);
						if (userIdArray.length === 0) {
							return [];
						}
						const userId: string = userIdArray[0]!;
						// Query all settings for this user
						const allUserSettings = yield* Effect.withSpan(
							"user_server_settings.findManyUserServerSettings.queryOptimized",
						)(
							Effect.tryPromise({
								try: () =>
									getManyFrom(
										ctx.db,
										"userServerSettings",
										"by_userId",
										userId,
									),
								catch: (error) => new Error(String(error)),
							}),
						);

						// Filter to only the serverIds we need
						const filtered = allUserSettings.filter((setting) =>
							serverIds.has(setting.serverId),
						);
						yield* Effect.annotateCurrentSpan({
							"settings.found": filtered.length,
						});
						return filtered;
					}

					// Fallback: multiple userIds, use original approach
					return yield* Effect.withSpan(
						"user_server_settings.findManyUserServerSettings.queryFallback",
					)(
						Effect.tryPromise({
							try: async () => {
								const results: UserServerSettings[] = [];
								for (const setting of args.settings) {
									const userSettings = await getManyFrom(
										ctx.db,
										"userServerSettings",
										"by_userId",
										setting.userId,
									);
									const found = userSettings.find(
										(s) => s.serverId === setting.serverId,
									);
									if (found) {
										results.push(found);
									}
								}
								return results;
							},
							catch: (error) => new Error(String(error)),
						}),
					);
				}),
			);
		});
		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});

export const findUserServerSettingsByApiKey = publicInternalQuery({
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

export const updateUserServerSettings = publicInternalMutation({
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

export const upsertUserServerSettings = publicInternalMutation({
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
			// Update existing
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
			// Create new
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

export const deleteUserServerSettingsByUserId = publicInternalMutation({
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

export const deleteUserServerSettingsByUserIdInternal = internalMutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteUserServerSettingsByUserIdLogic(ctx, args.userId);
		return null;
	},
});

export const upsertUserServerSettingsInternal = publicInternalMutation({
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
			// Update existing
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
			// Create new
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

export const countConsentingUsersInServer = publicInternalQuery({
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

export const countConsentingUsersInManyServers = publicInternalQuery({
	args: {
		serverIds: v.array(v.id("servers")),
	},
	handler: async (ctx, args) => {
		if (args.serverIds.length === 0) return [];

		const results: Array<{ serverId: Id<"servers">; count: number }> = [];

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
