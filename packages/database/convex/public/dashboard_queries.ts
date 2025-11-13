import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { query } from "../_generated/server";
import { authenticatedQuery } from "../shared/auth";
import {
	DISCORD_PERMISSIONS,
	getHighestRoleFromPermissions,
	hasPermission,
	isThreadType,
	sortServersByBotAndRole,
} from "../shared/shared";

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
		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

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
		const channelSettings = await asyncMap(channels, (channel) =>
			getOneFrom(ctx.db, "channelSettings", "by_channelId", channel.id),
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

// Query to get user's servers based on user server settings and permissions
// Returns servers where user has ManageGuild or Administrator permission
export const getUserServersForDropdown = authenticatedQuery({
	args: {},
	returns: v.array(
		v.object({
			discordId: v.string(),
			name: v.string(),
			icon: v.union(v.string(), v.null()),
			highestRole: v.union(v.string(), v.null()),
			hasBot: v.boolean(),
			aoServerId: v.id("servers"),
		}),
	),
	handler: async (ctx, args) => {
		const { discordAccountId } = args;

		const userServerSettings = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", discordAccountId))
			.collect();

		const manageableSettings = userServerSettings.filter((setting) => {
			const permissions = setting.permissions;
			return (
				hasPermission(permissions, DISCORD_PERMISSIONS.Administrator) ||
				hasPermission(permissions, DISCORD_PERMISSIONS.ManageGuild)
			);
		});

		const servers = await asyncMap(manageableSettings, async (setting) => {
			const server = await ctx.db.get(setting.serverId);
			if (!server) return null;

			const highestRole = getHighestRoleFromPermissions(setting.permissions);

			return {
				discordId: server.discordId,
				name: server.name,
				icon: server.icon ?? null,
				highestRole,
				hasBot: server.kickedTime === null || server.kickedTime === undefined,
				aoServerId: server._id,
			};
		});

		const validServers = servers.filter(
			(server): server is NonNullable<(typeof servers)[0]> => server !== null,
		);

		return sortServersByBotAndRole(validServers);
	},
});
