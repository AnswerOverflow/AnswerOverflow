import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Effect, Option, Predicate, Schema } from "effect";
import { Id } from "@packages/confect/server";
import { internal } from "../_generated/api";
import { internalAction as oldInternalAction } from "../client";
import {
	ServerSchema,
	ChannelSchema,
	ServerPreferencesSchema,
} from "../schema";
import {
	privateQuery,
	privateMutation,
	ConfectQueryCtx,
	ConfectMutationCtx,
} from "../client/confectPrivate";
import {
	internalQuery,
	ConfectQueryCtx as InternalConfectQueryCtx,
} from "../confect";
import { CHANNEL_TYPE } from "../shared/shared";

export type BrowsableServer = {
	discordId: string;
	name: string;
	icon: string | null;
	description: string | null;
	approximateMemberCount: number;
};

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

const ServerPreferencesWithSystemFields = Schema.extend(
	ServerPreferencesSchema,
	Schema.Struct({
		_id: Id.Id("serverPreferences"),
		_creationTime: Schema.Number,
	}),
);

const UpsertResultSchema = Schema.Struct({
	isNew: Schema.Boolean,
});

export const upsertServer = privateMutation({
	args: ServerSchema,
	returns: UpsertResultSchema,
	handler: (args) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectMutationCtx;
			const existingOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", args.discordId))
				.first();

			if (Option.isSome(existingOption)) {
				yield* db.patch(existingOption.value._id, {
					...args,
					kickedTime: undefined,
				});
				return { isNew: false };
			}
			yield* db.insert("servers", {
				...args,
				kickedTime: undefined,
			});
			return { isNew: true };
		}).pipe(Effect.orDie),
});

const PartialServerSchema = Schema.Struct({
	discordId: Schema.optional(Schema.BigIntFromSelf),
	name: Schema.optional(Schema.String),
	icon: Schema.optional(Schema.String),
	banner: Schema.optional(Schema.String),
	description: Schema.optional(Schema.String),
	vanityInviteCode: Schema.optional(Schema.String),
	kickedTime: Schema.optional(Schema.Number),
	approximateMemberCount: Schema.optional(Schema.Number),
});

const UpdateServerArgsSchema = Schema.Struct({
	serverId: Schema.BigIntFromSelf,
	server: PartialServerSchema,
});

export const updateServer = privateMutation({
	args: UpdateServerArgsSchema,
	returns: Schema.Null,
	handler: ({ serverId, server }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectMutationCtx;
			const existingOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", serverId))
				.first();

			if (Option.isNone(existingOption)) {
				return yield* Effect.die(
					new Error(`Server with id ${serverId} not found`),
				);
			}

			yield* db.patch(existingOption.value._id, server);
			return null;
		}).pipe(Effect.orDie),
});

export const getAllServers = privateQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(ServerWithSystemFields),
	handler: () =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const servers = yield* db.query("servers").collect();
			return [...servers];
		}),
});

export const getServerByDiscordId = privateQuery({
	args: Schema.Struct({
		discordId: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(ServerWithSystemFields),
	handler: ({ discordId }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const serverOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
				.first();
			return Option.getOrNull(serverOption);
		}),
});

export const findManyServersById = privateQuery({
	args: Schema.Struct({
		ids: Schema.Array(Id.Id("servers")),
	}),
	returns: Schema.Array(ServerWithSystemFields),
	handler: ({ ids }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			if (ids.length === 0) return [];

			const servers = [];
			for (const id of ids) {
				const serverOption = yield* db.get(id);
				if (Option.isSome(serverOption)) {
					servers.push(serverOption.value);
				}
			}
			return servers;
		}),
});

export const findManyServersByDiscordId = privateQuery({
	args: Schema.Struct({
		discordIds: Schema.Array(Schema.BigIntFromSelf),
	}),
	returns: Schema.Array(ServerWithSystemFields),
	handler: ({ discordIds }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			if (discordIds.length === 0) return [];

			const servers = [];
			for (const discordId of discordIds) {
				const serverOption = yield* db
					.query("servers")
					.withIndex("by_discordId", (q) => q.eq("discordId", discordId))
					.first();
				if (Option.isSome(serverOption)) {
					servers.push(serverOption.value);
				}
			}
			return servers;
		}),
});

export const getBrowseServers = privateQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(ServerWithSystemFields),
	handler: () =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const allServers = yield* Effect.promise(() =>
				ctx.db.query("servers").collect(),
			);

			const nonKickedServers = allServers.filter(
				(server) =>
					server.kickedTime === undefined || server.kickedTime === null,
			);

			const filteredServers: typeof nonKickedServers = [];

			for (const server of nonKickedServers) {
				const hasIndexingEnabled = yield* Effect.promise(() =>
					ctx.db
						.query("channelSettings")
						.withIndex("by_serverId_and_indexingEnabled", (q) =>
							q.eq("serverId", server.discordId).eq("indexingEnabled", true),
						)
						.first(),
				);

				if (hasIndexingEnabled) {
					filteredServers.push(server);
				}
			}

			return filteredServers.sort(
				(a, b) => b.approximateMemberCount - a.approximateMemberCount,
			);
		}),
});

export const getServerByDomain = privateQuery({
	args: Schema.Struct({
		domain: Schema.String,
	}),
	returns: Schema.NullOr(
		Schema.Struct({
			server: ServerWithSystemFields,
			preferences: ServerPreferencesWithSystemFields,
		}),
	),
	handler: ({ domain }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const preferences = yield* Effect.promise(() =>
				getOneFrom(
					ctx.db,
					"serverPreferences",
					"by_customDomain",
					domain,
					"customDomain",
				),
			);

			if (!preferences) {
				return null;
			}

			const server = yield* Effect.promise(() =>
				getOneFrom(
					ctx.db,
					"servers",
					"by_discordId",
					preferences.serverId,
					"discordId",
				),
			);

			if (!server) {
				return null;
			}

			return {
				server,
				preferences,
			};
		}),
});

const ServerWithDomainInfo = Schema.extend(
	ServerWithSystemFields,
	Schema.Struct({
		customDomain: Schema.optional(Schema.String),
		subpath: Schema.optional(Schema.String),
	}),
);

const ServerWithChannelsResult = Schema.Struct({
	server: ServerWithDomainInfo,
	channels: Schema.Array(ChannelWithSystemFields),
});

export const getServerByDiscordIdWithChannels = privateQuery({
	args: Schema.Struct({
		discordId: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(ServerWithChannelsResult),
	handler: ({ discordId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const server = yield* Effect.promise(() =>
				getOneFrom(ctx.db, "servers", "by_discordId", discordId),
			);

			if (!server) {
				return null;
			}

			const [indexedSettings, serverPreferences] = yield* Effect.promise(() =>
				Promise.all([
					ctx.db
						.query("channelSettings")
						.withIndex("by_serverId_and_indexingEnabled", (q) =>
							q.eq("serverId", server.discordId).eq("indexingEnabled", true),
						)
						.collect(),
					getOneFrom(
						ctx.db,
						"serverPreferences",
						"by_serverId",
						server.discordId,
					),
				]),
			);

			const indexedChannelIds = new Set(
				indexedSettings.map((s) => s.channelId),
			);

			const indexedChannels = yield* Effect.promise(() =>
				asyncMap(Array.from(indexedChannelIds), (channelId) =>
					getOneFrom(
						ctx.db,
						"channels",
						"by_discordChannelId",
						channelId,
						"id",
					),
				),
			);

			const channels = Arr.filter(indexedChannels, Predicate.isNotNull)
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

export const getBrowseServersInternal = internalQuery({
	args: Schema.Struct({}),
	returns: Schema.Array(ServerWithSystemFields),
	handler: () =>
		Effect.gen(function* () {
			const { ctx } = yield* InternalConfectQueryCtx;

			const allServers = yield* Effect.promise(() =>
				ctx.db.query("servers").collect(),
			);

			const nonKickedServers = allServers.filter(
				(server) =>
					server.kickedTime === undefined || server.kickedTime === null,
			);

			const filteredServers: typeof nonKickedServers = [];

			for (const server of nonKickedServers) {
				const hasIndexingEnabled = yield* Effect.promise(() =>
					ctx.db
						.query("channelSettings")
						.withIndex("by_serverId_and_indexingEnabled", (q) =>
							q.eq("serverId", server.discordId).eq("indexingEnabled", true),
						)
						.first(),
				);

				if (hasIndexingEnabled) {
					filteredServers.push(server);
				}
			}

			return filteredServers.sort(
				(a, b) => b.approximateMemberCount - a.approximateMemberCount,
			);
		}),
});

export const fetchBrowsableServersInternal = oldInternalAction({
	args: {},
	handler: async (ctx): Promise<BrowsableServer[]> => {
		const servers = await ctx.runQuery(
			internal.private.servers.getBrowseServersInternal,
			{},
		);

		return servers.map((s) => ({
			discordId: s.discordId.toString(),
			name: s.name,
			icon: s.icon ?? null,
			description: s.description ?? null,
			approximateMemberCount: s.approximateMemberCount,
		}));
	},
});
