import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { literals } from "convex-helpers/validators";
import { guildManagerMutation } from "../client/guildManager";
import { getServerByDiscordId, validateCustomDomain } from "../shared/shared";

const ADVANCED_AND_ABOVE_PLANS: ReadonlyArray<string> = [
	"ADVANCED",
	"PRO",
	"ENTERPRISE",
	"OPEN_SOURCE",
];

export const updateServerPreferencesFlags = guildManagerMutation({
	args: {
		flags: v.object({
			readTheRulesConsentEnabled: v.optional(v.boolean()),
			considerAllMessagesPublicEnabled: v.optional(v.boolean()),
			anonymizeMessagesEnabled: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		const server = await getServerByDiscordId(ctx, args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		let preferences: Awaited<
			ReturnType<typeof ctx.db.get<"serverPreferences">>
		> | null = null;
		preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
			"serverId",
		);

		if (!preferences) {
			const preferencesId = await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				plan: "FREE",
				...args.flags,
			});

			preferences = await getOneFrom(
				ctx.db,
				"serverPreferences",
				"by_serverId",
				args.serverId,
				"serverId",
			);

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

export const updateChannelSettingsFlags = guildManagerMutation({
	args: {
		channelId: v.int64(),
		flags: v.object({
			indexingEnabled: v.optional(v.boolean()),
			markSolutionEnabled: v.optional(v.boolean()),
			sendMarkSolutionInstructionsInNewThreads: v.optional(v.boolean()),
			autoThreadEnabled: v.optional(v.boolean()),
			forumGuidelinesConsentEnabled: v.optional(v.boolean()),
		}),
	},
	handler: async (ctx, args) => {
		const channel = await getOneFrom(
			ctx.db,
			"channels",
			"by_discordChannelId",
			args.channelId,
			"id",
		);

		if (!channel) {
			throw new Error("Channel not found");
		}

		const server = await getServerByDiscordId(ctx, channel.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		let settings: Awaited<
			ReturnType<typeof ctx.db.get<"channelSettings">>
		> | null = null;
		settings = await getOneFrom(
			ctx.db,
			"channelSettings",
			"by_channelId",
			args.channelId,
			"channelId",
		);

		if (!settings) {
			const settingsId = await ctx.db.insert("channelSettings", {
				channelId: args.channelId,
				serverId: channel.serverId,
				indexingEnabled: false,
				markSolutionEnabled: false,
				sendMarkSolutionInstructionsInNewThreads: false,
				autoThreadEnabled: false,
				forumGuidelinesConsentEnabled: false,
				...args.flags,
			});

			settings = await getOneFrom(
				ctx.db,
				"channelSettings",
				"by_channelId",
				args.channelId,
				"channelId",
			);

			if (!settings) {
				settings = await ctx.db.get(settingsId);
			}
		} else {
			await ctx.db.patch(settings._id, {
				...args.flags,
				serverId: channel.serverId,
			});
			settings = await ctx.db.get(settings._id);
		}

		if (!settings) {
			throw new Error("Failed to update channel settings");
		}

		return settings;
	},
});

export const updateCustomDomain = guildManagerMutation({
	args: {
		customDomain: v.union(v.string(), v.null()),
	},
	handler: async (ctx, args) => {
		const server = await getServerByDiscordId(ctx, args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		const domainError = validateCustomDomain(args.customDomain);
		if (domainError) {
			throw new Error(domainError);
		}

		let preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
			"serverId",
		);

		if (!preferences) {
			const preferencesId = await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				plan: "FREE",
				customDomain: args.customDomain ?? undefined,
			});
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

export const updateChannelSolutionTag = guildManagerMutation({
	args: {
		channelId: v.int64(),
		solutionTagId: v.union(v.int64(), v.null()),
	},
	handler: async (ctx, args) => {
		const channel = await getOneFrom(
			ctx.db,
			"channels",
			"by_discordChannelId",
			args.channelId,
			"id",
		);

		if (!channel) {
			throw new Error("Channel not found");
		}

		if (channel.type !== 15) {
			throw new Error("Solution tags can only be set on forum channels");
		}

		if (args.solutionTagId !== null) {
			const tagExists = channel.availableTags?.some(
				(tag) => tag.id === args.solutionTagId,
			);
			if (!tagExists) {
				throw new Error(
					"Selected tag does not exist in this channel's available tags",
				);
			}
		}

		const settings = await getOneFrom(
			ctx.db,
			"channelSettings",
			"by_channelId",
			args.channelId,
			"channelId",
		);

		if (!settings) {
			const settingsId = await ctx.db.insert("channelSettings", {
				channelId: args.channelId,
				serverId: channel.serverId,
				indexingEnabled: false,
				markSolutionEnabled: false,
				sendMarkSolutionInstructionsInNewThreads: false,
				autoThreadEnabled: false,
				forumGuidelinesConsentEnabled: false,
				solutionTagId: args.solutionTagId ?? undefined,
			});
			return settingsId;
		}

		await ctx.db.patch(settings._id, {
			solutionTagId: args.solutionTagId ?? undefined,
			serverId: channel.serverId,
		});

		return settings._id;
	},
});

export const generateBotCustomizationUploadUrl = guildManagerMutation({
	args: {
		type: literals("avatar", "banner"),
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

		const plan = preferences?.plan ?? "FREE";
		if (!ADVANCED_AND_ABOVE_PLANS.includes(plan)) {
			throw new Error("Bot customization requires Advanced plan or higher");
		}

		return await ctx.storage.generateUploadUrl();
	},
});

export const updateBotCustomization = guildManagerMutation({
	args: {
		botNickname: v.optional(v.union(v.string(), v.null())),
		botAvatarStorageId: v.optional(v.union(v.id("_storage"), v.null())),
		botBannerStorageId: v.optional(v.union(v.id("_storage"), v.null())),
		botBio: v.optional(v.union(v.string(), v.null())),
	},
	handler: async (ctx, args) => {
		const server = await getServerByDiscordId(ctx, args.serverId);
		if (!server) {
			throw new Error("Server not found");
		}

		let preferences = await getOneFrom(
			ctx.db,
			"serverPreferences",
			"by_serverId",
			args.serverId,
			"serverId",
		);

		const plan = preferences?.plan ?? "FREE";
		if (!ADVANCED_AND_ABOVE_PLANS.includes(plan)) {
			throw new Error("Bot customization requires Advanced plan or higher");
		}

		const updateFields: Record<string, string | undefined> = {};

		if (args.botNickname !== undefined) {
			updateFields.botNickname = args.botNickname ?? undefined;
		}
		if (args.botAvatarStorageId !== undefined) {
			updateFields.botAvatarStorageId = args.botAvatarStorageId ?? undefined;
		}
		if (args.botBannerStorageId !== undefined) {
			updateFields.botBannerStorageId = args.botBannerStorageId ?? undefined;
		}
		if (args.botBio !== undefined) {
			updateFields.botBio = args.botBio ?? undefined;
		}

		if (!preferences) {
			const preferencesId = await ctx.db.insert("serverPreferences", {
				serverId: args.serverId,
				plan: "FREE",
				...updateFields,
			});
			preferences = await ctx.db.get(preferencesId);
		} else {
			await ctx.db.patch(preferences._id, updateFields);
			preferences = await ctx.db.get(preferences._id);
		}

		if (!preferences) {
			throw new Error("Failed to update bot customization");
		}

		return preferences;
	},
});
