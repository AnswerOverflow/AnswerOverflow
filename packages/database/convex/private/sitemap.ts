import { v } from "convex/values";
import { getOneFrom } from "convex-helpers/server/relationships";
import { ChannelType } from "discord-api-types/v10";
import { internal } from "../_generated/api";
import { internalQuery, privateAction } from "../client";
import { getIndexedChannelIdsForServer } from "../shared/channels";
import { threadMessageCounts } from "./counts";

export const getServersForSitemapPage = internalQuery({
	args: {
		cursor: v.union(v.string(), v.null()),
	},
	handler: async (ctx, args) => {
		const result = await ctx.db
			.query("servers")
			.paginate({ numItems: 50, cursor: args.cursor });

		const servers = [];

		for (const server of result.page) {
			const msgCount = await threadMessageCounts.count(ctx, {
				bounds: { prefix: [server.discordId] },
			});

			if (msgCount < 100) continue;

			const prefs = await getOneFrom(
				ctx.db,
				"serverPreferences",
				"by_serverId",
				server.discordId,
			);

			servers.push({
				_id: server._id,
				discordId: server.discordId,
				hasCustomDomain: !!prefs?.customDomain,
				hasSubpath: !!prefs?.subpath,
				isKicked: !!server.kickedTime,
			});
		}

		return {
			servers,
			isDone: result.isDone,
			continueCursor: result.continueCursor,
		};
	},
});

export const getServersForSitemap = privateAction({
	args: {},
	handler: async (ctx) => {
		const allServers: Array<{
			_id: string;
			discordId: bigint;
			hasCustomDomain: boolean;
			hasSubpath: boolean;
			isKicked: boolean;
		}> = [];
		let cursor: string | null = null;
		let isDone = false;

		while (!isDone) {
			const result: {
				servers: typeof allServers;
				isDone: boolean;
				continueCursor: string | null;
			} = await ctx.runQuery(
				internal.private.sitemap.getServersForSitemapPage,
				{ cursor },
			);

			allServers.push(...result.servers);
			cursor = result.continueCursor;
			isDone = result.isDone;
		}

		return allServers;
	},
});

export const getThreadsForSitemapPage = internalQuery({
	args: {
		serverId: v.int64(),
		cursor: v.union(v.string(), v.null()),
		indexedChannelIds: v.array(v.int64()),
	},
	handler: async (ctx, args) => {
		const indexedChannelIdSet = new Set(args.indexedChannelIds);

		const result = await ctx.db
			.query("channels")
			.withIndex("by_serverId_and_type", (q) =>
				q.eq("serverId", args.serverId).eq("type", ChannelType.PublicThread),
			)
			.order("desc")
			.paginate({ numItems: 500, cursor: args.cursor });

		const eligibleThreads = [];
		for (const thread of result.page) {
			if (!thread.parentId || !indexedChannelIdSet.has(thread.parentId)) {
				continue;
			}

			const msgCount = await threadMessageCounts.count(ctx, {
				bounds: { prefix: [thread.serverId, thread.parentId, thread.id] },
			});

			if (msgCount > 3) {
				const lastmod =
					thread.archivedTimestamp ?? Number(thread.id >> 22n) + 1420070400000;
				eligibleThreads.push({ id: thread.id, lastmod });
			}
		}

		return {
			threads: eligibleThreads,
			isDone: result.isDone,
			continueCursor: result.continueCursor,
		};
	},
});

export const getIndexedChannelIdsForServerQuery = internalQuery({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		const indexedChannelIds = await getIndexedChannelIdsForServer(
			ctx,
			args.serverId,
		);
		return [...indexedChannelIds];
	},
});

export const collectThreadsForServer = privateAction({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		const indexedChannelIds = await ctx.runQuery(
			internal.private.sitemap.getIndexedChannelIdsForServerQuery,
			{ serverId: args.serverId },
		);

		if (indexedChannelIds.length === 0) {
			return [];
		}

		const allThreads: Array<{ id: bigint; lastmod: number }> = [];
		let cursor: string | null = null;
		let isDone = false;

		while (!isDone) {
			const result: {
				threads: Array<{ id: bigint; lastmod: number }>;
				isDone: boolean;
				continueCursor: string | null;
			} = await ctx.runQuery(
				internal.private.sitemap.getThreadsForSitemapPage,
				{
					serverId: args.serverId,
					cursor,
					indexedChannelIds,
				},
			);

			allThreads.push(...result.threads);
			cursor = result.continueCursor;
			isDone = result.isDone;
		}

		allThreads.sort((a, b) => (a.id > b.id ? -1 : a.id < b.id ? 1 : 0));

		return allThreads;
	},
});
