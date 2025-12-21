import type { GenericDatabaseReader } from "convex/server";
import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { DataModel } from "../_generated/dataModel";
import { enrichMessage } from "../shared/dataAccess";
import { getThreadStartMessage } from "../shared/messages";
import {
	channelWithSystemFieldsValidator,
	enrichedMessageValidator,
	paginatedValidator,
} from "../shared/publicSchemas";
import { CHANNEL_TYPE, getChannelWithSettings } from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const getChannelPageThreads = publicQuery({
	args: {
		channelDiscordId: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(
		v.object({
			thread: channelWithSystemFieldsValidator,
			message: v.union(enrichedMessageValidator, v.null()),
		}),
	),
	handler: async (ctx, args) => {
		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_parentId_and_id", (q) =>
				q.eq("parentId", args.channelDiscordId),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const threads = paginatedResult.page;

		const page = await asyncMap(threads, async (thread) => {
			const message = await getThreadStartMessage(ctx, thread.id);
			const enrichedMessage = message
				? await enrichMessage(ctx, message)
				: null;

			return {
				thread,
				message: enrichedMessage,
			};
		});

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

export const getChannelPageMessages = publicQuery({
	args: {
		channelDiscordId: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(
		v.object({
			message: v.union(enrichedMessageValidator, v.null()),
		}),
	),
	handler: async (ctx, args) => {
		const paginatedResult = await ctx.db
			.query("messages")
			.withIndex("by_channelId_and_id", (q) =>
				q.eq("channelId", args.channelDiscordId),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const page = await asyncMap(paginatedResult.page, async (message) => {
			const enrichedMessage = await enrichMessage(ctx, message);
			return {
				message: enrichedMessage,
			};
		});

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

export const getServerPageThreads = publicQuery({
	args: {
		serverDiscordId: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	returns: paginatedValidator(
		v.object({
			thread: channelWithSystemFieldsValidator,
			message: v.union(enrichedMessageValidator, v.null()),
			channel: v.union(
				v.object({
					id: v.int64(),
					name: v.string(),
					type: v.number(),
				}),
				v.null(),
			),
		}),
	),
	handler: async (ctx, args) => {
		const server = await getOneFrom(
			ctx.db,
			"servers",
			"by_discordId",
			args.serverDiscordId,
		);
		if (!server) {
			return { page: [], isDone: true, continueCursor: "" };
		}

		const indexedSettings = await ctx.db
			.query("channelSettings")
			.withIndex("by_serverId_and_indexingEnabled", (q) =>
				q.eq("serverId", server.discordId).eq("indexingEnabled", true),
			)
			.collect();

		const indexedChannelIds = indexedSettings.map((s) => s.channelId);

		const indexedChannels = await asyncMap(indexedChannelIds, (channelId) =>
			getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
		);

		const channelIdToInfo = new Map<
			bigint,
			{ id: bigint; name: string; type: number }
		>();
		for (const channel of indexedChannels) {
			if (channel) {
				channelIdToInfo.set(channel.id, {
					id: channel.id,
					name: channel.name,
					type: channel.type,
				});
			}
		}

		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_serverId", (q) => q.eq("serverId", server.discordId))
			.order("desc")
			.paginate(args.paginationOpts);

		const threads = Arr.filter(
			paginatedResult.page,
			(channel) =>
				channel.parentId !== undefined &&
				indexedChannelIds.includes(channel.parentId),
		);

		const page = await asyncMap(threads, async (thread) => {
			const channel = thread.parentId
				? (channelIdToInfo.get(thread.parentId) ?? null)
				: null;

			const message = await getThreadStartMessage(ctx, thread.id);
			const enrichedMessage = message
				? await enrichMessage(ctx, message)
				: null;

			return {
				thread,
				message: enrichedMessage,
				channel,
			};
		});

		return {
			page,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

async function getServerHeaderData(
	ctx: { db: GenericDatabaseReader<DataModel> },
	serverDiscordId: bigint,
) {
	const server = await getOneFrom(
		ctx.db,
		"servers",
		"by_discordId",
		serverDiscordId,
	);

	if (!server) return null;

	const [indexedSettings, serverPreferences] = await Promise.all([
		ctx.db
			.query("channelSettings")
			.withIndex("by_serverId_and_indexingEnabled", (q) =>
				q.eq("serverId", server.discordId).eq("indexingEnabled", true),
			)
			.collect(),
		getOneFrom(ctx.db, "serverPreferences", "by_serverId", server.discordId),
	]);

	const indexedChannelIds = indexedSettings.map((s) => s.channelId);

	const allIndexedChannels = await asyncMap(indexedChannelIds, (channelId) =>
		getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
	);

	const indexedChannels = Arr.filter(allIndexedChannels, Predicate.isNotNull)
		.filter(
			(c) =>
				c.type === CHANNEL_TYPE.GuildText ||
				c.type === CHANNEL_TYPE.GuildAnnouncement ||
				c.type === CHANNEL_TYPE.GuildForum,
		)
		.sort((a, b) => {
			if (a.type === CHANNEL_TYPE.GuildForum) return -1;
			if (b.type === CHANNEL_TYPE.GuildForum) return 1;
			if (a.type === CHANNEL_TYPE.GuildAnnouncement) return -1;
			if (b.type === CHANNEL_TYPE.GuildAnnouncement) return 1;
			return 0;
		});

	const channelInviteCode = indexedSettings.find(
		(s) => s.inviteCode,
	)?.inviteCode;
	const inviteCode = server.vanityInviteCode ?? channelInviteCode;

	return {
		server: {
			...server,
			customDomain: serverPreferences?.customDomain,
			subpath: serverPreferences?.subpath,
			inviteCode,
		},
		channels: indexedChannels,
	};
}

export const getCommunityPageHeaderData = publicQuery({
	args: {
		serverDiscordId: v.int64(),
		channelDiscordId: v.optional(v.int64()),
	},
	handler: async (ctx, args) => {
		const headerData = await getServerHeaderData(ctx, args.serverDiscordId);
		if (!headerData) return null;

		if (!args.channelDiscordId) {
			return {
				...headerData,
				selectedChannel: null,
			};
		}

		const channel = await getChannelWithSettings(ctx, args.channelDiscordId);
		if (!channel || channel.serverId !== headerData.server.discordId)
			return null;

		return {
			...headerData,
			selectedChannel: channel,
		};
	},
});
