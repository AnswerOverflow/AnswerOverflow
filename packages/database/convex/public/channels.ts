import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr } from "effect";
import { createDataAccessCache, enrichMessage } from "../shared/dataAccess";
import { getThreadStartMessage } from "../shared/messages";
import {
	channelWithSystemFieldsValidator,
	enrichedMessageValidator,
	paginatedValidator,
} from "../shared/publicSchemas";
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
		const cache = createDataAccessCache(ctx);

		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_parentId_and_id", (q) =>
				q.eq("parentId", args.channelDiscordId),
			)
			.order("desc")
			.paginate(args.paginationOpts);

		const threads = paginatedResult.page;

		const page = await asyncMap(threads, async (thread) => {
			const message = await getThreadStartMessage(cache, thread.id);
			const enrichedMessage = message
				? await enrichMessage(ctx, cache, message)
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

		const cache = createDataAccessCache(ctx);
		const page = await asyncMap(paginatedResult.page, async (message) => {
			const enrichedMessage = await enrichMessage(ctx, cache, message);
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

		const cache = createDataAccessCache(ctx);
		const page = await asyncMap(threads, async (thread) => {
			const channel = thread.parentId
				? (channelIdToInfo.get(thread.parentId) ?? null)
				: null;

			const message = await getThreadStartMessage(cache, thread.id);
			const enrichedMessage = message
				? await enrichMessage(ctx, cache, message)
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
