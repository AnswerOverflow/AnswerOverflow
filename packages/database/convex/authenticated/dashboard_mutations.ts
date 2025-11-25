import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { guildManagerMutation } from "../client/guildManager";
import { getServerByDiscordId, validateCustomDomain } from "../shared/shared";

export const updateServerPreferencesFlags = guildManagerMutation({
	args: {
		flags: v.object({
			readTheRulesConsentEnabled: v.optional(v.boolean()),
			considerAllMessagesPublicEnabled: v.optional(v.boolean()),
			anonymizeMessagesEnabled: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		const server = await getServerByDiscordId(ctx, args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		let preferences: Awaited<
			ReturnType<typeof ctx.db.get<"serverPreferences">>
		> | null = null;
		try {
			preferences =
				(await ctx.db
					.query("serverPreferences")
					.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
					.unique()) ?? null;
		} catch {
			throw new Error(
				`Multiple server preferences found for server ${args.serverId}. This indicates a data integrity issue.`,
			);
		}

		if (!preferences) {
			const preferencesId = await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				...args.flags,
			});

			await ctx.db.patch(server._id, { preferencesId });

			try {
				preferences =
					(await ctx.db
						.query("serverPreferences")
						.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
						.unique()) ?? null;
			} catch {
				throw new Error(
					`Multiple server preferences found for server ${args.serverId}. This indicates a data integrity issue.`,
				);
			}

			if (!preferences) {
				preferences = await ctx.db.get(preferencesId);
			}
		} else {
			await ctx.db.patch(preferences._id, args.flags);
			preferences = await ctx.db.get(preferences._id);
		}

		if (!preferences) {
			throw new Error("Failed to update server preferences");
		}

		return preferences;
	},
});

export const updateChannelSettingsFlags = guildManagerMutation({
	args: {
		channelId: v.int64(),
		flags: v.object({
			indexingEnabled: v.optional(v.boolean()),
			markSolutionEnabled: v.optional(v.boolean()),
			sendMarkSolutionInstructionsInNewThreads: v.optional(v.boolean()),
			autoThreadEnabled: v.optional(v.boolean()),
			forumGuidelinesConsentEnabled: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		const channel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.channelId))
			.first();

		if (!channel) {
			throw new Error("Channel not found");
		}

		const server = await getServerByDiscordId(ctx, channel.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		let settings: Awaited<
			ReturnType<typeof ctx.db.get<"channelSettings">>
		> | null = null;
		try {
			settings =
				(await ctx.db
					.query("channelSettings")
					.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
					.unique()) ?? null;
		} catch {
			throw new Error(
				`Multiple channel settings found for channel ${args.channelId}. This indicates a data integrity issue.`,
			);
		}

		if (!settings) {
			const settingsId = await ctx.db.insert("channelSettings", {
				channelId: args.channelId,
				indexingEnabled: false,
				markSolutionEnabled: false,
				sendMarkSolutionInstructionsInNewThreads: false,
				autoThreadEnabled: false,
				forumGuidelinesConsentEnabled: false,
				...args.flags,
			});

			try {
				settings =
					(await ctx.db
						.query("channelSettings")
						.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
						.unique()) ?? null;
			} catch {
				throw new Error(
					`Multiple channel settings found for channel ${args.channelId}. This indicates a data integrity issue.`,
				);
			}

			if (!settings) {
				settings = await ctx.db.get(settingsId);
			}
		} else {
			await ctx.db.patch(settings._id, args.flags);
			settings = await ctx.db.get(settings._id);
		}

		if (!settings) {
			throw new Error("Failed to update channel settings");
		}

		return settings;
	},
});

export const updateCustomDomain = guildManagerMutation({
	args: {
		customDomain: v.union(v.string(), v.null()),
	},
	handler: async (ctx, args) => {
		const server = await getServerByDiscordId(ctx, args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		const domainError = validateCustomDomain(args.customDomain);
		if (domainError) {
			throw new Error(domainError);
		}

		let preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		if (!preferences) {
			const preferencesId = await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				customDomain: args.customDomain ?? undefined,
			});
			await ctx.db.patch(server._id, { preferencesId });
			preferences = await ctx.db.get(preferencesId);
		} else {
			await ctx.db.patch(preferences._id, {
				customDomain: args.customDomain ?? undefined,
			});
			preferences = await ctx.db.get(preferences._id);
		}

		if (!preferences) {
			throw new Error("Failed to update custom domain");
		}

		return preferences;
	},
});
