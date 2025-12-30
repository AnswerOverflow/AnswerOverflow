import { getOneFrom } from "convex-helpers/server/relationships";
import { ChannelType } from "discord-api-types/v10";
import type { MutationCtx, QueryCtx } from "../client";
import type { Channel, ChannelSettings } from "../schema";

export { ChannelType };

export const CHANNEL_TYPE = ChannelType;

export function isThreadType(type: number): boolean {
	return (
		type === ChannelType.AnnouncementThread ||
		type === ChannelType.PublicThread ||
		type === ChannelType.PrivateThread
	);
}

export const ROOT_CHANNEL_TYPES = [
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.GuildForum,
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

export async function upsertChannelSettingsLogic(
	ctx: MutationCtx,
	channelId: bigint,
	settings: Partial<Omit<ChannelSettings, "channelId" | "serverId">>,
) {
	const [existingSettings, channel] = await Promise.all([
		getOneFrom(ctx.db, "channelSettings", "by_channelId", channelId),
		getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
	]);

	if (!channel) {
		throw new Error(`Channel ${channelId} not found`);
	}

	if (existingSettings) {
		await ctx.db.patch(existingSettings._id, {
			...existingSettings,
			...settings,
			channelId,
			serverId: channel.serverId,
		});
	} else {
		await ctx.db.insert("channelSettings", {
			...DEFAULT_CHANNEL_SETTINGS,
			...settings,
			channelId,
			serverId: channel.serverId,
		});
	}

	return channelId;
}

export async function getIndexedChannelIdsForServer(
	ctx: QueryCtx | MutationCtx,
	serverId: bigint,
): Promise<Set<bigint>> {
	const indexedSettings = await ctx.db
		.query("channelSettings")
		.withIndex("by_serverId_and_indexingEnabled", (q) =>
			q.eq("serverId", serverId).eq("indexingEnabled", true),
		)
		.collect();

	return new Set(indexedSettings.map((s) => s.channelId));
}
