"use node";

import { ActionCache } from "@convex-dev/action-cache";
import { v } from "convex/values";
import { api, components, internal } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { internalAction } from "../client";
import { guildManagerAction } from "../client/guildManager";
import {
	type ChannelInfo,
	type ChannelWithTags,
	detectPublicChannels,
	detectSolvedTags,
} from "../shared/ai";
import { CHANNEL_TYPE, isThreadType } from "../shared/channels";
import type { Channel, ChannelSettings, ForumTag } from "../schema";

type ChannelWithFlags = Channel & {
	flags: ChannelSettings;
	availableTags?: Array<ForumTag>;
};

type SerializedForumTag = {
	id: string;
	name: string;
	emojiId?: string;
	emojiName?: string;
	moderated: boolean;
};

type SerializedChannelRecommendation = {
	id: string;
	name: string;
	type: number;
	shouldIndex: boolean;
	availableTags?: Array<SerializedForumTag>;
	recommendedSettings: {
		indexingEnabled: boolean;
		autoThreadEnabled: boolean;
		markSolutionEnabled: boolean;
		sendMarkSolutionInstructionsInNewThreads: boolean;
		solutionTagId?: string;
		solutionTagName?: string;
	};
};

type SerializedRecommendedConfiguration = {
	channels: Array<SerializedChannelRecommendation>;
	serverSettings: {
		considerAllMessagesPublicEnabled: boolean;
		anonymizeMessagesEnabled: boolean;
	};
	detectionSuccessful: boolean;
	errorMessage?: string;
};

type ChannelRecommendation = {
	id: bigint;
	name: string;
	type: number;
	shouldIndex: boolean;
	availableTags?: Array<ForumTag>;
	recommendedSettings: {
		indexingEnabled: boolean;
		autoThreadEnabled: boolean;
		markSolutionEnabled: boolean;
		sendMarkSolutionInstructionsInNewThreads: boolean;
		solutionTagId?: bigint;
		solutionTagName?: string;
	};
};

type RecommendedConfiguration = {
	channels: Array<ChannelRecommendation>;
	serverSettings: {
		considerAllMessagesPublicEnabled: boolean;
		anonymizeMessagesEnabled: boolean;
	};
	detectionSuccessful: boolean;
	errorMessage?: string;
};

function serializeForumTag(tag: ForumTag): SerializedForumTag {
	return {
		id: tag.id.toString(),
		name: tag.name,
		emojiId: tag.emojiId?.toString(),
		emojiName: tag.emojiName,
		moderated: tag.moderated,
	};
}

function deserializeForumTag(tag: SerializedForumTag): ForumTag {
	return {
		id: BigInt(tag.id),
		name: tag.name,
		emojiId: tag.emojiId ? BigInt(tag.emojiId) : undefined,
		emojiName: tag.emojiName,
		moderated: tag.moderated,
	};
}

function serializeConfiguration(
	config: RecommendedConfiguration,
): SerializedRecommendedConfiguration {
	return {
		...config,
		channels: config.channels.map((channel) => ({
			...channel,
			id: channel.id.toString(),
			availableTags: channel.availableTags?.map(serializeForumTag),
			recommendedSettings: {
				...channel.recommendedSettings,
				solutionTagId: channel.recommendedSettings.solutionTagId?.toString(),
			},
		})),
	};
}

function deserializeConfiguration(
	config: SerializedRecommendedConfiguration,
): RecommendedConfiguration {
	return {
		...config,
		channels: config.channels.map((channel) => ({
			...channel,
			id: BigInt(channel.id),
			availableTags: channel.availableTags?.map(deserializeForumTag),
			recommendedSettings: {
				...channel.recommendedSettings,
				solutionTagId: channel.recommendedSettings.solutionTagId
					? BigInt(channel.recommendedSettings.solutionTagId)
					: undefined,
			},
		})),
	};
}

type ActionContext = {
	runQuery: <Query extends import("convex/server").FunctionReference<"query">>(
		query: Query,
		args: import("convex/server").FunctionArgs<Query>,
	) => Promise<import("convex/server").FunctionReturnType<Query>>;
};

async function computeRecommendedConfiguration(
	ctx: ActionContext,
	serverId: bigint,
): Promise<RecommendedConfiguration> {
	const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN ?? "";

	const server: Doc<"servers"> | null = await ctx.runQuery(
		api.private.servers.getServerByDiscordId,
		{
			discordId: serverId,
			backendAccessToken,
		},
	);

	if (!server) {
		return {
			channels: [],
			serverSettings: {
				considerAllMessagesPublicEnabled: true,
				anonymizeMessagesEnabled: false,
			},
			detectionSuccessful: false,
			errorMessage: "Server not found",
		};
	}

	const allChannels: Array<ChannelWithFlags> = await ctx.runQuery(
		api.private.channels.findAllChannelsByServerId,
		{
			serverId: serverId,
			backendAccessToken,
		},
	);

	const rootChannels = allChannels.filter(
		(channel: ChannelWithFlags) => !isThreadType(channel.type),
	);

	if (rootChannels.length === 0) {
		return {
			channels: [],
			serverSettings: {
				considerAllMessagesPublicEnabled: true,
				anonymizeMessagesEnabled: false,
			},
			detectionSuccessful: true,
			errorMessage: undefined,
		};
	}

	const forumChannels = rootChannels.filter(
		(c: ChannelWithFlags) => c.type === CHANNEL_TYPE.GuildForum,
	);
	const announcementChannels = rootChannels.filter(
		(c: ChannelWithFlags) => c.type === CHANNEL_TYPE.GuildAnnouncement,
	);
	const textChannels = rootChannels.filter(
		(c: ChannelWithFlags) =>
			c.type !== CHANNEL_TYPE.GuildForum &&
			c.type !== CHANNEL_TYPE.GuildAnnouncement,
	);

	const alwaysIndexIds = new Set([
		...forumChannels.map((c) => c.id.toString()),
		...announcementChannels.map((c) => c.id.toString()),
	]);

	const textChannelsForAI: Array<ChannelInfo> = textChannels.map(
		(c: ChannelWithFlags) => ({
			id: c.id,
			name: c.name,
			type: c.type,
		}),
	);

	let recommendedTextChannelIds: Array<string> = [];
	let detectionSuccessful = true;
	let errorMessage: string | undefined;

	if (textChannelsForAI.length > 0) {
		try {
			recommendedTextChannelIds = await detectPublicChannels(textChannelsForAI);
		} catch (error) {
			console.error("Failed to detect public channels:", error);
			detectionSuccessful = false;
			errorMessage =
				"Failed to auto-detect channels. Please configure manually.";
		}
	}

	const recommendedIdSet = new Set([
		...alwaysIndexIds,
		...recommendedTextChannelIds,
	]);

	const solutionTagMap = new Map<string, { id: bigint; name: string } | null>();

	if (detectionSuccessful) {
		const channelsWithTags: Array<ChannelWithTags> = forumChannels
			.filter((c) => c.availableTags && c.availableTags.length > 0)
			.map((c) => ({
				channelId: c.id,
				channelName: c.name,
				tags: c.availableTags!.map((t) => ({ id: t.id, name: t.name })),
			}));

		if (channelsWithTags.length > 0) {
			try {
				const solvedTagResults = await detectSolvedTags(channelsWithTags);
				for (const result of solvedTagResults) {
					if (result.solvedTagId) {
						const channel = forumChannels.find(
							(c) => c.id.toString() === result.channelId,
						);
						const tagName =
							channel?.availableTags?.find(
								(t) => t.id.toString() === result.solvedTagId,
							)?.name ?? "Solved";
						solutionTagMap.set(result.channelId, {
							id: BigInt(result.solvedTagId),
							name: tagName,
						});
					}
				}
			} catch (error) {
				console.error("Failed to detect solved tags:", error);
			}
		}
	}

	const channelRecommendations: Array<ChannelRecommendation> = rootChannels.map(
		(channel: ChannelWithFlags) => {
			const shouldIndex = recommendedIdSet.has(channel.id.toString());
			const solutionTag = solutionTagMap.get(channel.id.toString());
			const isTextChannel =
				channel.type !== CHANNEL_TYPE.GuildForum &&
				channel.type !== CHANNEL_TYPE.GuildAnnouncement;

			return {
				id: channel.id,
				name: channel.name,
				type: channel.type,
				shouldIndex,
				availableTags: channel.availableTags,
				recommendedSettings: {
					indexingEnabled: shouldIndex,
					autoThreadEnabled: shouldIndex && isTextChannel,
					markSolutionEnabled: shouldIndex,
					sendMarkSolutionInstructionsInNewThreads: shouldIndex,
					solutionTagId: solutionTag?.id,
					solutionTagName: solutionTag?.name,
				},
			};
		},
	);

	return {
		channels: channelRecommendations,
		serverSettings: {
			considerAllMessagesPublicEnabled: true,
			anonymizeMessagesEnabled: false,
		},
		detectionSuccessful,
		errorMessage,
	};
}

export const fetchRecommendedConfiguration = internalAction({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args): Promise<SerializedRecommendedConfiguration> => {
		const config = await computeRecommendedConfiguration(ctx, args.serverId);
		return serializeConfiguration(config);
	},
});

const getRecommendedConfigurationCache = () =>
	new ActionCache(components.actionCache, {
		action:
			internal.authenticated.onboarding_action.fetchRecommendedConfiguration,
		name: "recommendedConfiguration",
		ttl: 3600 * 1000,
	});

export const getRecommendedConfiguration = guildManagerAction({
	args: {},
	handler: async (ctx, args): Promise<RecommendedConfiguration> => {
		const cached = await getRecommendedConfigurationCache().fetch(ctx, {
			serverId: args.serverId,
		});
		return deserializeConfiguration(cached);
	},
});
