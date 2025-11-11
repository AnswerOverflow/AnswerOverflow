import { v } from "convex/values";
import { query } from "./_generated/server";
import { authComponent } from "./betterAuth";
import { components } from "./_generated/api";

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

// Permission flags from Discord API
const PERMISSIONS = {
	Administrator: 0x8,
	ManageGuild: 0x20,
} as const;

function hasPermission(permissions: number, permission: number): boolean {
	return (permissions & permission) === permission;
}

// Query to get user's servers based on user server settings and permissions
// Returns servers where user has ManageGuild or Administrator permission
export const getUserServersForDropdown = query({
	args: {},
	handler: async (ctx) => {
		// Get authenticated user
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return [];
		}

		// Get Discord account ID from BetterAuth
		// Component queries can be called with ctx.runQuery even from regular queries
		const accountResult = await ctx.runQuery(
			components.betterAuth.adapter.findOne,
			{
				model: "account",
				where: [
					{
						field: "userId",
						operator: "eq",
						value: user._id,
					},
					{
						field: "providerId",
						operator: "eq",
						value: "discord",
					},
				],
			},
		);

		// Type guard to ensure we have a valid account object
		if (
			!accountResult ||
			typeof accountResult !== "object" ||
			!("accountId" in accountResult) ||
			typeof accountResult.accountId !== "string"
		) {
			return [];
		}

		const discordAccountId = accountResult.accountId;

		// Get all user server settings for this user
		const userServerSettings = await ctx.db
			.query("userServerSettings")
			.withIndex("by_userId", (q) => q.eq("userId", discordAccountId))
			.collect();

		// Filter to only servers where user has ManageGuild or Administrator permission
		const manageableSettings = userServerSettings.filter((setting) => {
			const permissions = setting.permissions;
			return (
				hasPermission(permissions, PERMISSIONS.Administrator) ||
				hasPermission(permissions, PERMISSIONS.ManageGuild)
			);
		});

		// Get servers for these settings
		const servers = await Promise.all(
			manageableSettings.map(async (setting) => {
				const server = await ctx.db.get(setting.serverId);
				if (!server) return null;

				const permissions = setting.permissions;
				let highestRole: "Manage Guild" | "Administrator" | "Owner" =
					"Manage Guild";
				if (hasPermission(permissions, PERMISSIONS.Administrator)) {
					highestRole = "Administrator";
				}

				return {
					discordId: server.discordId,
					name: server.name,
					icon: server.icon ?? null,
					highestRole,
					hasBot: server.kickedTime === null || server.kickedTime === undefined,
					aoServerId: server._id,
				};
			}),
		);

		// Filter out nulls and sort: has bot + owner/admin/manage, then no bot + owner/admin/manage
		const validServers = servers.filter(
			(server): server is NonNullable<(typeof servers)[0]> => server !== null,
		);

		return validServers.sort((a, b) => {
			if (a.hasBot && !b.hasBot) return -1;
			if (!a.hasBot && b.hasBot) return 1;

			const roleOrder: Record<
				"Owner" | "Administrator" | "Manage Guild",
				number
			> = {
				Owner: 0,
				Administrator: 1,
				"Manage Guild": 2,
			};
			return roleOrder[a.highestRole] - roleOrder[b.highestRole];
		});
	},
});
