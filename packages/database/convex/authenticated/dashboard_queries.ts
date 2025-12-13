import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import { authenticatedQuery } from "../client";
import { guildManagerQuery } from "../client/guildManager";
import {
	DISCORD_PERMISSIONS,
	getHighestRoleFromPermissions,
	getServerByDiscordId,
	hasPermission,
	isThreadType,
	sortServersByBotAndRole,
} from "../shared/shared";
export const getDashboardData = guildManagerQuery({
	args: {},
	handler: async (ctx, args) => {
		const server = await getServerByDiscordId(ctx, args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		const preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
		);

		const allChannels = await getManyFrom(
			ctx.db,
			"channels",
			"by_serverId",
			args.serverId,
		);

		const channels = allChannels.filter(
			(channel) => !isThreadType(channel.type),
		);

		const channelSettings = await asyncMap(channels, (channel) =>
			getOneFrom(ctx.db, "channelSettings", "by_channelId", channel.id),
		);

		const channelsWithFlags = channels.map((channel, idx) => {
			const settings = channelSettings[idx];
			return {
				id: channel.id,
				name: channel.name,
				type: channel.type,
				botPermissions: channel.botPermissions ?? null,
				availableTags: channel.availableTags,
				flags: {
					indexingEnabled: settings?.indexingEnabled ?? false,
					markSolutionEnabled: settings?.markSolutionEnabled ?? false,
					sendMarkSolutionInstructionsInNewThreads:
						settings?.sendMarkSolutionInstructionsInNewThreads ?? false,
					autoThreadEnabled: settings?.autoThreadEnabled ?? false,
					forumGuidelinesConsentEnabled:
						settings?.forumGuidelinesConsentEnabled ?? false,
					solutionTagId: settings?.solutionTagId,
				},
			};
		});

		return {
			server: {
				discordId: server.discordId,
				name: server.name,
				icon: server.icon ?? null,
				plan: preferences?.plan ?? "FREE",
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

export const getUserServersForDropdown = authenticatedQuery({
	args: {},
	handler: async (ctx, args) => {
		const { discordAccountId } = args;

		const userServerSettings = await getManyFrom(
			ctx.db,
			"userServerSettings",
			"by_userId",
			discordAccountId,
		);

		const manageableSettings = userServerSettings.filter((setting) => {
			const permissions = setting.permissions;
			return (
				hasPermission(permissions, DISCORD_PERMISSIONS.Administrator) ||
				hasPermission(permissions, DISCORD_PERMISSIONS.ManageGuild)
			);
		});

		const servers = await asyncMap(manageableSettings, async (setting) => {
			const server = await getServerByDiscordId(ctx, setting.serverId);
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

		const validServers = Arr.filter(servers, Predicate.isNotNull);

		return sortServersByBotAndRole(validServers);
	},
});
