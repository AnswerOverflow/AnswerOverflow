import { getOneFrom } from "convex-helpers/server/relationships";
import { v } from "convex/values";
import { guildManagerMutation } from "../client/guildManager";
import { getServerByDiscordId } from "../shared/shared";

export const applyRecommendedConfiguration = guildManagerMutation({
	args: {
		channelConfigurations: v.array(
			v.object({
				channelId: v.int64(),
				indexingEnabled: v.boolean(),
				markSolutionEnabled: v.boolean(),
				sendMarkSolutionInstructionsInNewThreads: v.boolean(),
				autoThreadEnabled: v.optional(v.boolean()),
				solutionTagId: v.optional(v.int64()),
			}),
		),
		serverSettings: v.object({
			considerAllMessagesPublicEnabled: v.boolean(),
			anonymizeMessagesEnabled: v.boolean(),
		}),
	},
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
			"serverId",
		);

		if (!preferences) {
			await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				plan: "FREE",
				considerAllMessagesPublicEnabled:
					args.serverSettings.considerAllMessagesPublicEnabled,
				anonymizeMessagesEnabled: args.serverSettings.anonymizeMessagesEnabled,
			});
		} else {
			await ctx.db.patch(preferences._id, {
				considerAllMessagesPublicEnabled:
					args.serverSettings.considerAllMessagesPublicEnabled,
				anonymizeMessagesEnabled: args.serverSettings.anonymizeMessagesEnabled,
			});
		}

		for (const config of args.channelConfigurations) {
			const channel = await getOneFrom(
				ctx.db,
				"channels",
				"by_discordChannelId",
				config.channelId,
				"id",
			);

			if (!channel) {
				continue;
			}

			const existingSettings = await getOneFrom(
				ctx.db,
				"channelSettings",
				"by_channelId",
				config.channelId,
				"channelId",
			);

			if (!existingSettings) {
				await ctx.db.insert("channelSettings", {
					channelId: config.channelId,
					serverId: channel.serverId,
					indexingEnabled: config.indexingEnabled,
					markSolutionEnabled: config.markSolutionEnabled,
					sendMarkSolutionInstructionsInNewThreads:
						config.sendMarkSolutionInstructionsInNewThreads,
					autoThreadEnabled: config.autoThreadEnabled ?? false,
					forumGuidelinesConsentEnabled: false,
					solutionTagId: config.solutionTagId,
				});
			} else {
				await ctx.db.patch(existingSettings._id, {
					indexingEnabled: config.indexingEnabled,
					markSolutionEnabled: config.markSolutionEnabled,
					sendMarkSolutionInstructionsInNewThreads:
						config.sendMarkSolutionInstructionsInNewThreads,
					autoThreadEnabled: config.autoThreadEnabled ?? false,
					solutionTagId: config.solutionTagId,
					serverId: channel.serverId,
				});
			}
		}

		return { success: true };
	},
});
