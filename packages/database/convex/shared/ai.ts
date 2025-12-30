import { gateway, generateText, Output } from "ai";
import { ChannelType } from "discord-api-types/v10";
import { z } from "zod";
import type { Channel, ForumTag } from "../schema";

export type ChannelInfo = Pick<Channel, "id" | "name" | "type">;

export type TagInfo = Pick<ForumTag, "id" | "name">;

export async function detectPublicChannels(
	channels: Array<ChannelInfo>,
): Promise<Array<string>> {
	const channelList = channels
		.map((c) => {
			const typeLabel =
				c.type === ChannelType.GuildForum
					? "Forum"
					: c.type === ChannelType.GuildAnnouncement
						? "Announcement"
						: "Text";
			return `- ${c.name} (${typeLabel}, id: ${c.id})`;
		})
		.join("\n");

	const result = await generateText({
		model: gateway("google/gemini-2.0-flash"),
		output: Output.object({
			schema: z.object({
				channelIds: z.array(z.string()).describe("IDs of channels to index"),
			}),
		}),
		prompt: `You are analyzing Discord channel names for a community server. Your task is to identify which channels would be good to make publicly indexable by search engines.

Good candidates include:
- Help/support channels (questions, faq, troubleshooting, etc.)
- Discussion forums and general chat
- Community content (fan art, creations, showcases)
- Resource channels (guides, tutorials, tips)

Forum channels (type 15) are particularly good candidates.

Exclude channels that should stay private:
- Admin/mod channels
- Off-topic/random/memes (unless it's a main community channel)
- Announcements-only channels
- Voice channel text chats
- Bot command channels

Here are the channels:
${channelList}

Return the IDs of channels that would be good for public indexing.`,
	});

	return result.output!.channelIds;
}

export type ChannelWithTags = {
	channelId: bigint;
	channelName: string;
	tags: Array<TagInfo>;
};

export type SolvedTagResult = {
	channelId: string;
	solvedTagId: string | null;
};

export async function detectSolvedTags(
	channels: Array<ChannelWithTags>,
): Promise<Array<SolvedTagResult>> {
	const channelsWithTags = channels.filter((c) => c.tags.length > 0);

	if (channelsWithTags.length === 0) {
		return [];
	}

	const channelList = channelsWithTags
		.map((c) => {
			const tagList = c.tags
				.map((t) => `    - ${t.name} (id: ${t.id})`)
				.join("\n");
			return `Channel: ${c.channelName} (id: ${c.channelId})\n  Tags:\n${tagList}`;
		})
		.join("\n\n");

	const result = await generateText({
		model: gateway("google/gemini-2.0-flash"),
		output: Output.object({
			schema: z.object({
				results: z
					.array(
						z.object({
							channelId: z.string().describe("The channel ID"),
							solvedTagId: z
								.string()
								.nullable()
								.describe("The ID of the solved tag, or null if none"),
						}),
					)
					.describe("Solved tag detection results for each channel"),
			}),
		}),
		prompt: `You are analyzing Discord forum tags for multiple channels. For each channel, identify which tag (if any) represents a "solved" or "answered" state.

Common solved tag names include: solved, resolved, answered, done, fixed, completed, closed, solution found, etc.

Here are the channels and their available tags:

${channelList}

For each channel, return its ID and the ID of the tag that best represents a solved/answered state (or null if no such tag exists).`,
	});

	return result.output!.results;
}
