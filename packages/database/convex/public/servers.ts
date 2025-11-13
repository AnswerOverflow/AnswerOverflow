import { createConvexOtelLayer } from "@packages/observability/convex-effect-otel";
import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Effect } from "effect";
import { query } from "../_generated/server";
import type { channelSettingsSchema } from "../schema";
import {
	CHANNEL_TYPE,
	getServerByDiscordId as getServerByDiscordIdShared,
	ROOT_CHANNEL_TYPES,
} from "../shared/shared";

type ChannelSettings = Infer<typeof channelSettingsSchema>;

const _DEFAULT_CHANNEL_SETTINGS: ChannelSettings = {
	channelId: "",
	indexingEnabled: false,
	markSolutionEnabled: false,
	sendMarkSolutionInstructionsInNewThreads: false,
	autoThreadEnabled: false,
	forumGuidelinesConsentEnabled: false,
};

/**
 * Public query: Get all servers
 * No authentication required - returns public server data
 */
export const publicGetAllServers = query({
	args: {},
	handler: async (ctx) => {
		return await ctx.db.query("servers").collect();
	},
});

/**
 * Public query: Get server by Discord ID
 * No authentication required - returns public server data
 */
export const publicGetServerByDiscordId = query({
	args: {
		discordId: v.string(),
	},
	handler: async (ctx, args) => {
		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan("servers.getServerByDiscordId")(
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"discord.id": args.discordId,
						"convex.function": "publicGetServerByDiscordId",
					});
					return yield* Effect.tryPromise({
						try: () => getServerByDiscordIdShared(ctx, args.discordId),
						catch: (error) => new Error(String(error)),
					});
				}),
			);
		});
		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});

export const publicGetServerById = query({
	args: {
		id: v.id("servers"),
	},
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const publicFindServerByAlias = query({
	args: {
		alias: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("vanityUrl"), args.alias))
			.first();
	},
});

export const publicFindServerByAliasOrId = query({
	args: {
		aliasOrId: v.string(),
	},
	handler: async (ctx, args) => {
		// Try as vanity URL first
		const byAlias = await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("vanityUrl"), args.aliasOrId))
			.first();
		if (byAlias) return byAlias;

		// Try as Discord ID
		return await getOneFrom(ctx.db, "servers", "by_discordId", args.aliasOrId);
	},
});

export const publicFindServerByCustomDomain = query({
	args: {
		domain: v.string(),
	},
	handler: async (ctx, args) => {
		const servers = await ctx.db.query("servers").collect();
		for (const server of servers) {
			const preferences = server.preferencesId
				? await ctx.db.get(server.preferencesId)
				: null;
			if (preferences?.customDomain === args.domain) {
				return server;
			}
		}
		return null;
	},
});

export const publicFindServerByStripeCustomerId = query({
	args: {
		stripeCustomerId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.filter((q) => q.eq(q.field("stripeCustomerId"), args.stripeCustomerId))
			.first();
	},
});

export const publicFindServerByStripeSubscriptionId = query({
	args: {
		stripeSubscriptionId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("servers")
			.filter((q) =>
				q.eq(q.field("stripeSubscriptionId"), args.stripeSubscriptionId),
			)
			.first();
	},
});

export const publicFindManyServersById = query({
	args: {
		ids: v.array(v.id("servers")),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];
		const results = await asyncMap(args.ids, (id) => ctx.db.get(id));
		return results.filter((server) => server !== null);
	},
});

/**
 * Public query: Find many servers by Discord IDs
 * More efficient than calling publicGetServerByDiscordId multiple times
 */
export const publicFindManyServersByDiscordId = query({
	args: {
		discordIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		const tracedEffect = Effect.gen(function* () {
			yield* Effect.annotateCurrentSpan({
				"convex.function": "publicFindManyServersByDiscordId",
				"servers.count": args.discordIds.length,
			});
			if (args.discordIds.length === 0) return [];
			// Use the index to query each Discord ID efficiently
			// Execute queries in parallel using Effect.all for better Effect integration
			const results = yield* Effect.all(
				args.discordIds.map((discordId) =>
					Effect.promise(() =>
						getOneFrom(ctx.db, "servers", "by_discordId", discordId),
					),
				),
				{ concurrency: "unbounded" },
			);
			return results.filter((server) => server !== null);
		}).pipe(
			Effect.withSpan("servers.findManyServersByDiscordId", {
				attributes: {
					"convex.function": "publicFindManyServersByDiscordId",
				},
			}),
		);
		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});

export const publicGetBiggestServers = query({
	args: {
		take: v.number(),
	},
	handler: async (ctx, args) => {
		const tracedEffect = Effect.gen(function* () {
			return yield* Effect.withSpan("servers.getBiggestServers")(
				Effect.gen(function* () {
					console.log("annotating span");
					yield* Effect.annotateCurrentSpan({
						"convex.function": "publicGetBiggestServers",
						"servers.take": args.take,
					});
					return yield* Effect.tryPromise({
						try: async () => {
							const allServers = await ctx.db.query("servers").collect();
							return allServers
								.sort(
									(a, b) => b.approximateMemberCount - a.approximateMemberCount,
								)
								.slice(0, args.take);
						},
						catch: (error) => new Error(String(error)),
					});
				}),
			);
		});
		return await Effect.provide(
			tracedEffect,
			createConvexOtelLayer("database"),
		).pipe(Effect.runPromise);
	},
});

export const publicFindServerByIdWithChannels = query({
	args: {
		id: v.id("servers"),
	},
	handler: async (ctx, args) => {
		const server = await ctx.db.get(args.id);
		if (!server) return null;

		// Get all channels for this server
		const allChannels = await ctx.db
			.query("channels")
			.filter((q) => q.eq(q.field("serverId"), args.id))
			.collect();

		// Filter to only root channel types (forums, announcements, text)
		const rootChannels = allChannels.filter((channel) =>
			ROOT_CHANNEL_TYPES.includes(
				channel.type as (typeof ROOT_CHANNEL_TYPES)[number],
			),
		);

		// Get channel settings for all root channels
		const channelIds = rootChannels.map((c) => c.id);
		const allSettings = await Promise.all(
			channelIds.map((id) =>
				getOneFrom(ctx.db, "channelSettings", "by_channelId", id),
			),
		);

		// Filter to only channels with indexing enabled
		const indexedChannels = rootChannels.filter((_channel, idx) => {
			const settings = allSettings[idx];
			return settings?.indexingEnabled ?? false;
		});

		// Sort: forums first, then announcements, then text
		const sortedChannels = indexedChannels.sort((a, b) => {
			if (a.type === CHANNEL_TYPE.GuildForum) return -1;
			if (b.type === CHANNEL_TYPE.GuildForum) return 1;
			if (a.type === CHANNEL_TYPE.GuildAnnouncement) return -1;
			if (b.type === CHANNEL_TYPE.GuildAnnouncement) return 1;
			return 0;
		});

		return {
			...server,
			channels: sortedChannels,
		};
	},
});
