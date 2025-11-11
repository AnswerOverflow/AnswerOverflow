import { v } from "convex/values";
import { api } from "./_generated/api";
import { mutation } from "./_generated/server";
import { assertCanEditServer, getDiscordAccountIdFromAuth } from "./auth";
import type { AuthorizedUser, CanEditServer } from "./permissions";

/**
 * Update server preferences flags (for dashboard)
 * Only updates the flags, not other preferences fields
 */
export const updateServerPreferencesFlags = mutation({
	args: {
		serverId: v.id("servers"),
		flags: v.object({
			readTheRulesConsentEnabled: v.optional(v.boolean()),
			considerAllMessagesPublicEnabled: v.optional(v.boolean()),
			anonymizeMessagesEnabled: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);

		const server = await ctx.db.get(args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<CanEditServer> =
			await assertCanEditServer(ctx, server.discordId, discordAccountId);

		// Get or create preferences
		let preferences = server.preferencesId
			? await ctx.db.get(server.preferencesId)
			: null;

		if (!preferences) {
			// Create new preferences
			const preferencesId = await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				...args.flags,
			});
			await ctx.db.patch(args.serverId, { preferencesId });
			preferences = await ctx.db.get(preferencesId);
		} else {
			// Update existing preferences
			await ctx.db.patch(preferences._id, args.flags);
			preferences = await ctx.db.get(preferences._id);
		}

		if (!preferences) {
			throw new Error("Failed to update server preferences");
		}

		return preferences;
	},
});

/**
 * Update channel settings flags (for dashboard)
 * Only updates the flags, not other channel fields
 */
export const updateChannelSettingsFlags = mutation({
	args: {
		channelId: v.string(),
		flags: v.object({
			indexingEnabled: v.optional(v.boolean()),
			markSolutionEnabled: v.optional(v.boolean()),
			sendMarkSolutionInstructionsInNewThreads: v.optional(v.boolean()),
			autoThreadEnabled: v.optional(v.boolean()),
			forumGuidelinesConsentEnabled: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);

		// Get channel to get server ID
		const channel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.channelId))
			.first();

		if (!channel) {
			throw new Error("Channel not found");
		}

		// Get server to check permissions
		const server = await ctx.db.get(channel.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<CanEditServer> =
			await assertCanEditServer(ctx, server.discordId, discordAccountId);

		// Get or create settings
		let settings = await ctx.db
			.query("channelSettings")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
			.first();

		if (!settings) {
			// Create new settings
			await ctx.db.insert("channelSettings", {
				channelId: args.channelId,
				indexingEnabled: false,
				markSolutionEnabled: false,
				sendMarkSolutionInstructionsInNewThreads: false,
				autoThreadEnabled: false,
				forumGuidelinesConsentEnabled: false,
				...args.flags,
			});
			settings = await ctx.db
				.query("channelSettings")
				.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
				.first();
		} else {
			// Update existing settings
			await ctx.db.patch(settings._id, args.flags);
			settings = await ctx.db.get(settings._id);
		}

		if (!settings) {
			throw new Error("Failed to update channel settings");
		}

		return settings;
	},
});
