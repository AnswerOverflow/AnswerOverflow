import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { ChannelType } from "discord-api-types/v10";
import { Array as Arr, Predicate } from "effect";
import { authenticatedQuery } from "../client";
import { guildManagerQuery } from "../client/guildManager";
import {
	rootChannelMessageCounts,
	threadCounts,
	threadMessageCounts,
} from "../private/counts";
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

export const getIndexedMessageCount = guildManagerQuery({
	args: {},
	handler: async (ctx, args) => {
		const [rootCount, threadMsgCount, threadCount, recentThreads] =
			await Promise.all([
				rootChannelMessageCounts.count(ctx, {
					bounds: { prefix: [args.serverId] },
				}),
				threadMessageCounts.count(ctx, {
					bounds: { prefix: [args.serverId] },
				}),
				threadCounts.count(ctx, {
					bounds: { prefix: [args.serverId] },
				}),
				ctx.db
					.query("channels")
					.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
					.order("desc")
					.filter((q) =>
						q.or(
							q.eq(q.field("type"), ChannelType.AnnouncementThread),
							q.eq(q.field("type"), ChannelType.PublicThread),
							q.eq(q.field("type"), ChannelType.PrivateThread),
						),
					)
					.take(5),
			]);

		const recentThreadsWithAuthors = await asyncMap(
			recentThreads,
			async (thread) => {
				const starterMessage = await getOneFrom(
					ctx.db,
					"messages",
					"by_messageId",
					thread.id,
					"id",
				);

				let author: {
					id: string;
					name: string;
					avatar: string | null;
				} | null = null;

				if (starterMessage) {
					const discordAccount = await getOneFrom(
						ctx.db,
						"discordAccounts",
						"by_discordAccountId",
						starterMessage.authorId,
						"id",
					);
					if (discordAccount) {
						author = {
							id: discordAccount.id.toString(),
							name: discordAccount.name,
							avatar: discordAccount.avatar ?? null,
						};
					}
				}

				return {
					id: thread.id,
					name: thread.name,
					author,
				};
			},
		);

		const totalMessages = rootCount + threadMsgCount;
		const avgMessagesPerThread =
			threadCount > 0 ? Math.round(totalMessages / threadCount) : 0;

		return {
			messages: totalMessages,
			threads: threadCount,
			avgMessagesPerThread,
			recentThreads: recentThreadsWithAuthors,
		};
	},
});
