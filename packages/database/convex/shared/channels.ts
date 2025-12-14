import { getOneFrom } from "convex-helpers/server/relationships";
import type { MutationCtx, QueryCtx } from "../client";
import type { Channel } from "../schema";

export const CHANNEL_TYPE = {
	GuildText: 0,
	GuildAnnouncement: 5,
	GuildForum: 15,
	AnnouncementThread: 10,
	PublicThread: 11,
	PrivateThread: 12,
} as const;

export function isThreadType(type: number): boolean {
	return (
		type === CHANNEL_TYPE.AnnouncementThread ||
		type === CHANNEL_TYPE.PublicThread ||
		type === CHANNEL_TYPE.PrivateThread
	);
}

export const ROOT_CHANNEL_TYPES = [
	CHANNEL_TYPE.GuildText,
	CHANNEL_TYPE.GuildAnnouncement,
	CHANNEL_TYPE.GuildForum,
] as const;

export const DEFAULT_CHANNEL_SETTINGS = {
	channelId: 0n,
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
	solutionTagId: undefined,
	lastIndexedSnowflake: undefined,
	inviteCode: undefined,
};

export async function getChannelWithSettings(
	ctx: QueryCtx | MutationCtx,
	channelId: bigint,
) {
	const channel = await getOneFrom(
		ctx.db,
		"channels",
		"by_discordChannelId",
		channelId,
		"id",
	);

	if (!channel) {
		return null;
	}

	const settings = await getOneFrom(
		ctx.db,
		"channelSettings",
		"by_channelId",
		channelId,
	);

	return {
		...channel,
		flags: settings ?? { ...DEFAULT_CHANNEL_SETTINGS, channelId },
	};
}

export async function isChannelIndexingEnabled(
	ctx: QueryCtx | MutationCtx,
	channel: Pick<Channel, "id" | "parentId">,
): Promise<boolean> {
	const targetChannelId = channel.parentId ?? channel.id;
	const settings = await getOneFrom(
		ctx.db,
		"channelSettings",
		"by_channelId",
		targetChannelId,
	);
	return settings?.indexingEnabled ?? false;
}

export async function deleteChannelInternalLogic(
	ctx: MutationCtx,
	id: bigint,
): Promise<void> {
	const threads = await ctx.db
		.query("channels")
		.withIndex("by_parentId", (q) => q.eq("parentId", id))
		.collect();

	for (const thread of threads) {
		await deleteChannelInternalLogic(ctx, thread.id);
	}

	const settings = await ctx.db
		.query("channelSettings")
		.withIndex("by_channelId", (q) => q.eq("channelId", id))
		.collect();

	for (const setting of settings) {
		await ctx.db.delete(setting._id);
	}

	const channel = await getOneFrom(
		ctx.db,
		"channels",
		"by_discordChannelId",
		id,
		"id",
	);

	if (channel) {
		await ctx.db.delete(channel._id);
	}
}
