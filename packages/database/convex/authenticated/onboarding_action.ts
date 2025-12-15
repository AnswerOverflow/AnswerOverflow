"use node";

import { api } from "../_generated/api";
import type { Doc } from "../_generated/dataModel";
import { guildManagerAction } from "../client/guildManager";
import {
	type ChannelInfo,
	detectPublicChannels,
	detectSolvedTag,
	type TagInfo,
} from "../shared/ai";
import { CHANNEL_TYPE, isThreadType } from "../shared/channels";
import type { Channel, ChannelSettings, ForumTag } from "../schema";

type ChannelWithFlags = Channel & {
	flags: ChannelSettings;
	availableTags?: Array<ForumTag>;
};

type ChannelRecommendation = {
	id: bigint;
	name: string;
	type: number;
	shouldIndex: boolean;
	availableTags?: Array<{ id: bigint; name: string }>;
	recommendedSettings: {
		indexingEnabled: boolean;
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

export const getRecommendedConfiguration = guildManagerAction({
	args: {},
	handler: async (ctx, args): Promise<RecommendedConfiguration> => {
		const backendAccessToken = process.env.BACKEND_ACCESS_TOKEN ?? "";

		const server: Doc<"servers"> | null = await ctx.runQuery(
			api.private.servers.getServerByDiscordId,
			{
				discordId: args.serverId,
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
				serverId: args.serverId,
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

		const channelsForAI: Array<ChannelInfo> = rootChannels.map(
			(c: ChannelWithFlags) => ({
				id: c.id.toString(),
				name: c.name,
				type: c.type,
			}),
		);

		let recommendedChannelIds: Array<string> = [];
		let detectionSuccessful = true;
		let errorMessage: string | undefined;

		try {
			recommendedChannelIds = await detectPublicChannels(channelsForAI);
		} catch (error) {
			console.error("Failed to detect public channels:", error);
			detectionSuccessful = false;
			errorMessage =
				"Failed to auto-detect channels. Please configure manually.";
		}

		const recommendedIdSet = new Set(recommendedChannelIds);

		const forumChannels = rootChannels.filter(
			(c: ChannelWithFlags) =>
				c.type === CHANNEL_TYPE.GuildForum &&
				recommendedIdSet.has(c.id.toString()),
		);

		const solutionTagMap = new Map<
			string,
			{ id: bigint; name: string } | null
		>();

		if (detectionSuccessful) {
			for (const channel of forumChannels) {
				if (channel.availableTags && channel.availableTags.length > 0) {
					try {
						const tags: Array<TagInfo> = channel.availableTags.map(
							(t: ForumTag) => ({
								id: t.id.toString(),
								name: t.name,
							}),
						);
						const solvedTagId = await detectSolvedTag(channel.name, tags);
						if (solvedTagId) {
							const tagName =
								channel.availableTags.find(
									(t) => t.id.toString() === solvedTagId,
								)?.name ?? "Solved";
							solutionTagMap.set(channel.id.toString(), {
								id: BigInt(solvedTagId),
								name: tagName,
							});
						}
					} catch (error) {
						console.error(
							`Failed to detect solved tag for channel ${channel.name}:`,
							error,
						);
					}
				}
			}
		}

		const channelRecommendations: Array<ChannelRecommendation> =
			rootChannels.map((channel: ChannelWithFlags) => {
				const shouldIndex = recommendedIdSet.has(channel.id.toString());
				const solutionTag = solutionTagMap.get(channel.id.toString());

				return {
					id: channel.id,
					name: channel.name,
					type: channel.type,
					shouldIndex,
					availableTags: channel.availableTags?.map((t) => ({
						id: t.id,
						name: t.name,
					})),
					recommendedSettings: {
						indexingEnabled: shouldIndex,
						markSolutionEnabled: shouldIndex,
						sendMarkSolutionInstructionsInNewThreads: shouldIndex,
						solutionTagId: solutionTag?.id,
						solutionTagName: solutionTag?.name,
					},
				};
			});

		return {
			channels: channelRecommendations,
			serverSettings: {
				considerAllMessagesPublicEnabled: true,
				anonymizeMessagesEnabled: false,
			},
			detectionSuccessful,
			errorMessage,
		};
	},
});
