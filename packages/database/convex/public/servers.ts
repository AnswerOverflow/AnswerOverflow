import { ActionCache } from "@convex-dev/action-cache";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Effect, Option, Predicate, Schema } from "effect";
import { Id } from "@packages/confect/server";
import { components, internal } from "../_generated/api";
import type { BrowsableServer } from "../private/servers";
import { ServerSchema, ChannelSchema } from "../schema";
import { CHANNEL_TYPE } from "../shared/shared";
import { publicAction } from "./custom_functions";
import {
	publicQuery as confectPublicQuery,
	ConfectQueryCtx,
} from "../client/confectPublic";

const ServerWithSystemFields = Schema.extend(
	ServerSchema,
	Schema.Struct({
		_id: Id.Id("servers"),
		_creationTime: Schema.Number,
	}),
);

const ChannelWithSystemFields = Schema.extend(
	ChannelSchema,
	Schema.Struct({
		_id: Id.Id("channels"),
		_creationTime: Schema.Number,
	}),
);

const ServerByDomainResultSchema = Schema.Struct({
	server: ServerWithSystemFields,
	preferences: Schema.Struct({
		customDomain: Schema.optional(Schema.String),
		subpath: Schema.optional(Schema.String),
	}),
});

export const getServerByDomain = confectPublicQuery({
	args: Schema.Struct({
		domain: Schema.String,
	}),
	returns: Schema.NullOr(ServerByDomainResultSchema),
	handler: ({ domain }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;

			const preferencesOption = yield* db
				.query("serverPreferences")
				.withIndex("by_customDomain", (q) => q.eq("customDomain", domain))
				.first();

			if (Option.isNone(preferencesOption)) {
				return null;
			}

			const preferences = preferencesOption.value;

			const serverOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) =>
					q.eq("discordId", preferences.serverId),
				)
				.first();

			if (Option.isNone(serverOption)) {
				return null;
			}

			return {
				server: serverOption.value,
				preferences: {
					customDomain: preferences.customDomain,
					subpath: preferences.subpath,
				},
			};
		}),
});

export const getBrowseServers = confectPublicQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(ServerWithSystemFields),
	handler: () =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;

			const allServers = yield* db.query("servers").collect();

			const nonKickedServers = [...allServers].filter(
				(server) =>
					server.kickedTime === undefined || server.kickedTime === null,
			);

			const filteredServers: typeof nonKickedServers = [];

			for (const server of nonKickedServers) {
				const hasIndexingEnabled = yield* db
					.query("channelSettings")
					.withIndex("by_serverId_and_indexingEnabled", (q) =>
						q.eq("serverId", server.discordId).eq("indexingEnabled", true),
					)
					.first();

				if (Option.isSome(hasIndexingEnabled)) {
					filteredServers.push(server);
				}
			}

			return filteredServers.sort(
				(a, b) => b.approximateMemberCount - a.approximateMemberCount,
			);
		}),
});

const ServerWithChannelsSchema = Schema.Struct({
	server: Schema.extend(
		ServerWithSystemFields,
		Schema.Struct({
			customDomain: Schema.optional(Schema.String),
			subpath: Schema.optional(Schema.String),
		}),
	),
	channels: Schema.Array(ChannelWithSystemFields),
});

export const getServerByDiscordIdWithChannels = confectPublicQuery({
	args: Schema.Struct({
		discordId: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(ServerWithChannelsSchema),
	handler: ({ discordId }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;

			const serverOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
				.first();

			if (Option.isNone(serverOption)) {
				return null;
			}

			const server = serverOption.value;

			const [indexedSettings, serverPreferences] = yield* Effect.all([
				db
					.query("channelSettings")
					.withIndex("by_serverId_and_indexingEnabled", (q) =>
						q.eq("serverId", server.discordId).eq("indexingEnabled", true),
					)
					.collect(),
				Effect.promise(() =>
					getOneFrom(
						ctx.db,
						"serverPreferences",
						"by_serverId",
						server.discordId,
					),
				),
			]);

			const indexedChannelIds = new Set(
				[...indexedSettings].map((s) => s.channelId),
			);

			const indexedChannelOptions = yield* Effect.all(
				Array.from(indexedChannelIds).map((channelId) =>
					db
						.query("channels")
						.withIndex("by_discordChannelId", (q) => q.eq("id", channelId))
						.first(),
				),
			);

			const indexedChannels = Arr.filter(
				indexedChannelOptions.map((opt) => Option.getOrNull(opt)),
				Predicate.isNotNull,
			);

			const channels = [...indexedChannels]
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

			return {
				server: {
					...server,
					customDomain: serverPreferences?.customDomain,
					subpath: serverPreferences?.subpath,
				},
				channels,
			};
		}),
});

const getBrowsableServersCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.private.servers.fetchBrowsableServersInternal,
		name: "browsableServers",
		ttl: 30 * 60 * 1000, // 30 minutes
	});

export const getCachedBrowsableServers = publicAction({
	args: {},
	handler: async (ctx): Promise<BrowsableServer[]> => {
		return await getBrowsableServersCache().fetch(ctx, {});
	},
});
