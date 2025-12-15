import { v } from "convex/values";
import { guildManagerMutation } from "../client/guildManager";
import { channelSettingsSchema } from "../schema";
import {
	getServerByDiscordId,
	pick,
	upsertChannelSettingsLogic,
	upsertServerPreferencesLogic,
} from "../shared";

const channelConfigurationValidator = v.object({
	...pick(channelSettingsSchema, [
		"channelId",
		"indexingEnabled",
		"markSolutionEnabled",
		"sendMarkSolutionInstructionsInNewThreads",
		"solutionTagId",
	]),
	autoThreadEnabled: v.optional(v.boolean()),
});

export const applyRecommendedConfiguration = guildManagerMutation({
	args: {
		channelConfigurations: v.array(channelConfigurationValidator),
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

		await upsertServerPreferencesLogic(ctx, args.serverId, {
			considerAllMessagesPublicEnabled:
				args.serverSettings.considerAllMessagesPublicEnabled,
			anonymizeMessagesEnabled: args.serverSettings.anonymizeMessagesEnabled,
		});

		for (const config of args.channelConfigurations) {
			try {
				await upsertChannelSettingsLogic(ctx, config.channelId, {
					indexingEnabled: config.indexingEnabled,
					markSolutionEnabled: config.markSolutionEnabled,
					sendMarkSolutionInstructionsInNewThreads:
						config.sendMarkSolutionInstructionsInNewThreads,
					autoThreadEnabled: config.autoThreadEnabled ?? false,
					solutionTagId: config.solutionTagId,
				});
			} catch {
				continue;
			}
		}

		return { success: true };
	},
});
