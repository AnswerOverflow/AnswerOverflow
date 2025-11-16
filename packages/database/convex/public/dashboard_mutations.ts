import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { authenticatedMutation } from "../client";
import { assertCanEditServer } from "../shared/auth";
import type { AuthorizedUser, CanEditServer } from "../shared/permissions";
import { validateCustomDomain } from "../shared/shared";

/**
 * Update server preferences flags (for dashboard)
 * Only updates the flags, not other preferences fields
 */
export const updateServerPreferencesFlags = authenticatedMutation({
	args: {
		serverId: v.id("servers"),
		flags: v.object({
			readTheRulesConsentEnabled: v.optional(v.boolean()),
			considerAllMessagesPublicEnabled: v.optional(v.boolean()),
			anonymizeMessagesEnabled: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		const { discordAccountId } = args;

		const server = await ctx.db.get(args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<CanEditServer> =
			await assertCanEditServer(ctx, server.discordId, discordAccountId);

		// unique() returns undefined if no document exists, throws if multiple exist
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
			// unique() throws if multiple documents exist - this enforces uniqueness at the database level
			throw new Error(
				`Multiple server preferences found for server ${args.serverId}. This indicates a data integrity issue.`,
			);
		}

		if (!preferences) {
			const preferencesId = await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				...args.flags,
			});

			await ctx.db.patch(args.serverId, { preferencesId });

			// Re-query using unique() to get the created preferences (handles race conditions and enforces uniqueness)
			try {
				preferences =
					(await ctx.db
						.query("serverPreferences")
						.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
						.unique()) ?? null;
			} catch {
				// If multiple documents exist, this is a data integrity issue
				throw new Error(
					`Multiple server preferences found for server ${args.serverId}. This indicates a data integrity issue.`,
				);
			}

			// If still not found (shouldn't happen), try direct get as fallback
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

/**
 * Update channel settings flags (for dashboard)
 * Only updates the flags, not other channel fields
 */
export const updateChannelSettingsFlags = authenticatedMutation({
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
		const { discordAccountId } = args;

		const channel = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("id"), args.channelId))
			.first();

		if (!channel) {
			throw new Error("Channel not found");
		}

		const server = await ctx.db.get(channel.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<CanEditServer> =
			await assertCanEditServer(ctx, server.discordId, discordAccountId);

		// unique() returns undefined if no document exists, throws if multiple exist
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
			// unique() throws if multiple documents exist - this enforces uniqueness at the database level
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

			// Re-query using unique() to get the created settings (handles race conditions and enforces uniqueness)
			try {
				settings =
					(await ctx.db
						.query("channelSettings")
						.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
						.unique()) ?? null;
			} catch {
				// If multiple documents exist, this is a data integrity issue
				throw new Error(
					`Multiple channel settings found for channel ${args.channelId}. This indicates a data integrity issue.`,
				);
			}

			// If still not found (shouldn't happen), try direct get as fallback
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

/**
 * Update custom domain for a server (for dashboard)
 */
export const updateCustomDomain = authenticatedMutation({
	args: {
		serverId: v.id("servers"),
		customDomain: v.union(v.string(), v.null()),
	},
	handler: async (ctx, args) => {
		const { discordAccountId } = args;

		const server = await ctx.db.get(args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Permission check returns branded type - TypeScript enforces it's used
		const _authorizedUser: AuthorizedUser<CanEditServer> =
			await assertCanEditServer(ctx, server.discordId, discordAccountId);

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
			await ctx.db.patch(args.serverId, { preferencesId });
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
