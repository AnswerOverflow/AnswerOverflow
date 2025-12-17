import { gateway, generateObject } from "ai";
import { z } from "zod";

export type ChannelInfo = {
	id: string;
	name: string;
	type: number;
};

export type TagInfo = {
	id: string;
	name: string;
};

export async function detectPublicChannels(
	channels: Array<ChannelInfo>,
): Promise<Array<string>> {
	const channelList = channels
		.map((c) => {
			const typeLabel =
				c.type === 15 ? "Forum" : c.type === 5 ? "Announcement" : "Text";
			return `- ${c.name} (${typeLabel}, id: ${c.id})`;
		})
		.join("\n");

	const result = await generateObject({
		model: gateway("google/gemini-2.0-flash"),
		schema: z.object({
			channelIds: z.array(z.string()).describe("IDs of channels to index"),
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

	return result.object.channelIds;
}

export async function detectSolvedTag(
	channelName: string,
	tags: Array<TagInfo>,
): Promise<string | null> {
	if (tags.length === 0) {
		return null;
	}

	const tagList = tags.map((t) => `- ${t.name} (id: ${t.id})`).join("\n");

	const result = await generateObject({
		model: gateway("google/gemini-2.0-flash"),
		schema: z.object({
			solvedTagId: z
				.string()
				.nullable()
				.describe(
					"The ID of the tag that represents solved/answered, or null if none",
				),
		}),
		prompt: `You are analyzing Discord forum tags for a channel called "${channelName}". Your task is to identify which tag (if any) represents a "solved" or "answered" state.

Common solved tag names include: solved, resolved, answered, done, fixed, completed, closed, solution found, etc.

Here are the available tags:
${tagList}

Return the ID of the tag that best represents a solved/answered state, or null if no such tag exists.`,
	});

	return result.object.solvedTagId;
}
