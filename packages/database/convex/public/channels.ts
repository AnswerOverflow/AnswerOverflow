import { type Infer, v } from "convex/values";
import { type MutationCtx, type QueryCtx, query } from "../_generated/server";
import type { channelSchema, channelSettingsSchema } from "../schema";
import { getChannelWithSettings, isThreadType } from "../shared/shared";

type Channel = Infer<typeof channelSchema>;
type ChannelSettings = Infer<typeof channelSettingsSchema>;

const DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

// Helper function to add settings to multiple channels
async function addSettingsToChannels(
	ctx: QueryCtx | MutationCtx,
	channels: Channel[],
): Promise<Array<Channel & { flags: ChannelSettings }>> {
	if (channels.length === 0) return [];

	const channelIds = channels.map((c) => c.id);
	const allSettings = await Promise.all(
		channelIds.map((id) =>
			ctx.db
				.query("channelSettings")
				.withIndex("by_channelId", (q) => q.eq("channelId", id))
				.first(),
		),
	);

	return channels.map((channel, idx) => ({
		...channel,
		flags: allSettings[idx] ?? {
			...DEFAULT_CHANNEL_SETTINGS,
			channelId: channel.id,
		},
	}));
}

export const getChannelByDiscordId = query({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		return await getChannelWithSettings(ctx, args.discordId);
	},
});

export const findManyChannelsById = query({
	args: {
		ids: v.array(v.string()),
		includeMessageCount: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const channels: Channel[] = [];
		for (const id of args.ids) {
			const channel = await ctx.db
				.query("channels")
				.filter((q) => q.eq(q.field("id"), id))
				.first();
			if (channel) {
				channels.push(channel);
			}
		}

		const channelsWithFlags = await addSettingsToChannels(ctx, channels);

		if (args.includeMessageCount) {
			// Note: Message count functionality would require a messages table
			// For now, we'll return undefined for messageCount
			return channelsWithFlags.map((c) => ({
				...c,
				messageCount: isThreadType(c.type) ? undefined : undefined, // TODO: Implement when messages table exists
			}));
		}

		return channelsWithFlags;
	},
});
