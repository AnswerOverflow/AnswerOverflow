import { v } from "convex/values";
import { guildManagerMutation } from "../client/guildManager";
import {
	getServerByDiscordId,
	upsertChannelSettingsLogic,
	upsertServerPreferencesLogic,
} from "../shared";

const channelConfigurationValidator = v.object({
	channelId: v.int64(),
	indexingEnabled: v.boolean(),
	markSolutionEnabled: v.boolean(),
	sendMarkSolutionInstructionsInNewThreads: v.boolean(),
	solutionTagId: v.optional(v.int64()),
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

		const errors: Array<{ channelId: bigint; error: string }> = [];
		for (const config of args.channelConfigurations) {
			try {
				await upsertChannelSettingsLogic(ctx, config.channelId, config);
			} catch (error) {
				errors.push({
					channelId: config.channelId,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}

		if (errors.length > 0) {
			console.error("Failed to apply some channel configurations:", errors);
		}

		return { success: true };
	},
});
