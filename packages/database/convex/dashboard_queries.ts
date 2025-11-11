import { v } from "convex/values";
import { query } from "./_generated/server";
import {
	getDiscordAccountIdFromAuth,
	getUserServerSettingsForServerByDiscordId,
} from "./auth";

/**
 * Get dashboard data for a server (server + channels + preferences + settings)
 * Used by dashboard UI to display and manage server settings
 *
 * Protected query: Requires user to be authenticated and a member of the server
 */
export const getDashboardData = query({
	args: {
		serverId: v.id("servers"),
	},
	handler: async (ctx, args) => {
		// Check authentication
		const discordAccountId = await getDiscordAccountIdFromAuth(ctx);
		if (!discordAccountId) {
			return null; // Not authenticated
		}

		// Get server
		const server = await ctx.db.get(args.serverId);
		if (!server) {
			return null;
		}

		// Verify user has access to this server
		const settings = await getUserServerSettingsForServerByDiscordId(
			ctx,
			discordAccountId,
			server.discordId,
		);
		if (!settings) {
			return null; // User not a member of the server
		}

		// Get server preferences
		const preferences = server.preferencesId
			? await ctx.db.get(server.preferencesId)
			: null;

		// Get all channels for this server
		const channels = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("serverId"), args.serverId))
			.collect();

		// Get channel settings for all channels
		const channelSettings = await Promise.all(
			channels.map((channel) =>
				ctx.db
					.query("channelSettings")
					.withIndex("by_channelId", (q) => q.eq("channelId", channel.id))
					.first(),
			),
		);

		// Combine channels with their settings
		const channelsWithSettings = channels.map((channel, idx) => ({
			...channel,
			flags: channelSettings[idx] ?? {
				channelId: channel.id,
				indexingEnabled: false,
				markSolutionEnabled: false,
				sendMarkSolutionInstructionsInNewThreads: false,
				autoThreadEnabled: false,
				forumGuidelinesConsentEnabled: false,
			},
		}));

		// Filter to root channels (forums, announcements, text) and sort
		const rootChannels = channelsWithSettings.filter((channel) =>
			[0, 5, 15].includes(channel.type),
		);

		const sortedChannels = rootChannels.sort((a, b) => {
			if (a.type === 15) return -1; // GuildForum
			if (b.type === 15) return 1;
			if (a.type === 5) return -1; // GuildAnnouncement
			if (b.type === 5) return 1;
			return 0;
		});

		return {
			server: {
				...server,
				preferences: preferences ?? {
					serverId: args.serverId,
					readTheRulesConsentEnabled: false,
					considerAllMessagesPublicEnabled: false,
					anonymizeMessagesEnabled: false,
				},
			},
			channels: sortedChannels,
		};
	},
});
