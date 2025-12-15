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

export async function detectHelpChannels(
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
		prompt: `You are analyzing Discord channel names for a developer community. Your task is to identify which channels are likely help/support channels that should be indexed for search engines.

Help channels typically have names containing words like: help, support, questions, faq, troubleshoot, assistance, ask, issues, bugs, debugging, general (when it's a forum), etc.

Forum channels (type 15) are particularly good candidates as they often contain Q&A style content.

Here are the channels:
${channelList}

Return the IDs of channels that should be indexed. Be inclusive - if a channel might contain helpful content, include it. Exclude channels that are clearly not for help (like announcements-only, showcase, off-topic, memes, etc).`,
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
