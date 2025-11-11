import { v } from "convex/values";
import { query } from "./_generated/server";

// Channel types from Discord API
const ChannelType = {
	AnnouncementThread: 10,
	PublicThread: 11,
	PrivateThread: 12,
} as const;

// Helper function to check if a channel type is a thread
function isThreadType(type: number): boolean {
	return (
		type === ChannelType.AnnouncementThread ||
		type === ChannelType.PublicThread ||
		type === ChannelType.PrivateThread
	);
}

// Query to get dashboard data for a server
// Returns server with preferences and channels with settings
export const getDashboardData = query({
	args: { serverId: v.id("servers") },
	handler: async (ctx, args) => {
		// Get server directly from database
		const server = await ctx.db.get(args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		// Get server preferences directly from database
		const preferences = await ctx.db
			.query("serverPreferences")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.first();

		// Get channels for the server directly from database
		// Filter out threads (only show root channels: text, announcement, forum)
		const allChannels = await ctx.db
			.query("channels")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.collect();

		const channels = allChannels.filter(
			(channel) => !isThreadType(channel.type),
		);

		// Get channel settings for all channels
		const channelSettings = await Promise.all(
			channels.map((channel) =>
				ctx.db
					.query("channelSettings")
					.withIndex("by_channelId", (q) => q.eq("channelId", channel.id))
					.first(),
			),
		);

		// Map channels to the format expected by the dashboard
		const channelsWithFlags = channels.map((channel, idx) => {
			const settings = channelSettings[idx];
			return {
				id: channel.id,
				name: channel.name,
				type: channel.type,
				flags: {
					indexingEnabled: settings?.indexingEnabled ?? false,
					markSolutionEnabled: settings?.markSolutionEnabled ?? false,
					sendMarkSolutionInstructionsInNewThreads:
						settings?.sendMarkSolutionInstructionsInNewThreads ?? false,
					autoThreadEnabled: settings?.autoThreadEnabled ?? false,
					forumGuidelinesConsentEnabled:
						settings?.forumGuidelinesConsentEnabled ?? false,
				},
			};
		});

		return {
			server: {
				discordId: server.discordId,
				name: server.name,
				icon: server.icon ?? null,
				plan: server.plan,
				customDomain: preferences?.customDomain ?? null,
				preferences: {
					readTheRulesConsentEnabled:
						preferences?.readTheRulesConsentEnabled ?? false,
					considerAllMessagesPublicEnabled:
						preferences?.considerAllMessagesPublicEnabled ?? false,
					anonymizeMessagesEnabled:
						preferences?.anonymizeMessagesEnabled ?? false,
				},
			},
			channels: channelsWithFlags,
		};
	},
});
