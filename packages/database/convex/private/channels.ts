import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Effect, Option, Predicate, Schema } from "effect";
import { Id } from "@packages/confect/server";
import {
	internalMutation as oldInternalMutation,
	type MutationCtx,
	type QueryCtx,
} from "../client";
import {
	ChannelSchema,
	ChannelSettingsSchema,
	type Channel,
	type ChannelSettings,
} from "../schema";
import {
	privateQuery,
	privateMutation,
	ConfectQueryCtx,
	ConfectMutationCtx,
} from "../client/confectPrivate";
import {
	CHANNEL_TYPE,
	DEFAULT_CHANNEL_SETTINGS,
	deleteChannelInternalLogic,
	getChannelWithSettings,
	ROOT_CHANNEL_TYPES,
} from "../shared/shared";

const ChannelWithSystemFields = Schema.extend(
	ChannelSchema,
	Schema.Struct({
		_id: Id.Id("channels"),
		_creationTime: Schema.Number,
	}),
);

const ChannelSettingsWithSystemFields = Schema.extend(
	ChannelSettingsSchema,
	Schema.Struct({
		_id: Id.Id("channelSettings"),
		_creationTime: Schema.Number,
	}),
);

const ChannelWithFlags = Schema.extend(
	ChannelWithSystemFields,
	Schema.Struct({
		flags: ChannelSettingsSchema,
	}),
);

async function addSettingsToChannels(
	ctx: QueryCtx | MutationCtx,
	channels: Channel[],
): Promise<Array<Channel & { flags: ChannelSettings }>> {
	if (channels.length === 0) return [];

	const channelIds = channels.map((c) => c.id);
	const allSettings = await asyncMap(channelIds, (id) =>
		getOneFrom(ctx.db, "channelSettings", "by_channelId", id),
	);

	return channels.map((channel, idx) => ({
		...channel,
		flags: allSettings[idx] ?? {
			...DEFAULT_CHANNEL_SETTINGS,
			channelId: channel.id,
		},
	}));
}

export const findChannelByDiscordId = privateQuery({
	args: Schema.Struct({
		discordId: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(ChannelWithFlags),
	handler: ({ discordId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;
			const result = yield* Effect.promise(() =>
				getChannelWithSettings(ctx, discordId),
			);
			return result;
		}),
});

async function addSettingsToChannelsWithSystemFields<
	T extends { id: bigint; _id: unknown; _creationTime: number },
>(
	ctx: QueryCtx | MutationCtx,
	channels: T[],
): Promise<Array<T & { flags: ChannelSettings }>> {
	if (channels.length === 0) return [];

	const channelIds = channels.map((c) => c.id);
	const allSettings = await asyncMap(channelIds, (id) =>
		getOneFrom(ctx.db, "channelSettings", "by_channelId", id),
	);

	return channels.map((channel, idx) => ({
		...channel,
		flags: allSettings[idx] ?? {
			...DEFAULT_CHANNEL_SETTINGS,
			channelId: channel.id,
		},
	}));
}

export const findAllChannelsByServerId = privateQuery({
	args: Schema.Struct({
		serverId: Schema.BigIntFromSelf,
	}),
	returns: Schema.Array(ChannelWithFlags),
	handler: ({ serverId }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;

			const channelsByType = yield* Effect.all(
				ROOT_CHANNEL_TYPES.map((type) =>
					db
						.query("channels")
						.withIndex("by_serverId_and_type", (q) =>
							q.eq("serverId", serverId).eq("type", type),
						)
						.collect(),
				),
			);

			const channels = channelsByType.flat();
			const result = yield* Effect.promise(() =>
				addSettingsToChannelsWithSystemFields(ctx, [...channels]),
			);
			return result;
		}),
});

export const findManyChannelsByDiscordIds = privateQuery({
	args: Schema.Struct({
		discordIds: Schema.Array(Schema.BigIntFromSelf),
	}),
	returns: Schema.Array(ChannelWithSystemFields),
	handler: ({ discordIds }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const channels = yield* Effect.all(
				[...discordIds].map((id) =>
					db
						.query("channels")
						.withIndex("by_discordChannelId", (q) => q.eq("id", id))
						.first(),
				),
			);
			return Arr.filter(
				channels.map((opt) => Option.getOrNull(opt)),
				Predicate.isNotNull,
			);
		}),
});

export const findChannelsByDiscordIds = privateQuery({
	args: Schema.Struct({
		discordIds: Schema.Array(Schema.BigIntFromSelf),
	}),
	returns: Schema.Array(ChannelWithFlags),
	handler: ({ discordIds }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;
			const channelOptions = yield* Effect.all(
				[...discordIds].map((id) =>
					db
						.query("channels")
						.withIndex("by_discordChannelId", (q) => q.eq("id", id))
						.first(),
				),
			);
			const validChannels = Arr.filter(
				channelOptions.map((opt) => Option.getOrNull(opt)),
				Predicate.isNotNull,
			);
			const result = yield* Effect.promise(() =>
				addSettingsToChannelsWithSystemFields(ctx, [...validChannels]),
			);
			return result;
		}),
});

export const upsertChannel = privateMutation({
	args: Schema.Struct({
		channel: ChannelSchema,
	}),
	returns: Schema.Null,
	handler: ({ channel }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectMutationCtx;
			const existing = yield* Effect.promise(() =>
				getOneFrom(ctx.db, "channels", "by_discordChannelId", channel.id, "id"),
			);

			if (existing) {
				yield* db.patch(existing._id, channel);
			} else {
				yield* db.insert("channels", channel);
			}
			return null;
		}).pipe(Effect.orDie),
});

export const deleteChannel = privateMutation({
	args: Schema.Struct({
		id: Schema.BigIntFromSelf,
	}),
	returns: Schema.Null,
	handler: ({ id }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;
			yield* Effect.promise(() => deleteChannelInternalLogic(ctx, id));
			return null;
		}),
});

const PartialChannelSettingsSchema = Schema.Struct({
	channelId: Schema.optional(Schema.BigIntFromSelf),
	serverId: Schema.optional(Schema.BigIntFromSelf),
	indexingEnabled: Schema.optional(Schema.Boolean),
	markSolutionEnabled: Schema.optional(Schema.Boolean),
	sendMarkSolutionInstructionsInNewThreads: Schema.optional(Schema.Boolean),
	autoThreadEnabled: Schema.optional(Schema.Boolean),
	forumGuidelinesConsentEnabled: Schema.optional(Schema.Boolean),
	solutionTagId: Schema.optional(Schema.BigIntFromSelf),
	lastIndexedSnowflake: Schema.optional(Schema.BigIntFromSelf),
	inviteCode: Schema.optional(Schema.String),
});

export const updateChannelSettings = privateMutation({
	args: Schema.Struct({
		channelId: Schema.BigIntFromSelf,
		settings: PartialChannelSettingsSchema,
	}),
	returns: Schema.BigIntFromSelf,
	handler: ({ channelId, settings }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectMutationCtx;

			const [existingSettings, channel] = yield* Effect.promise(() =>
				Promise.all([
					getOneFrom(ctx.db, "channelSettings", "by_channelId", channelId),
					getOneFrom(
						ctx.db,
						"channels",
						"by_discordChannelId",
						channelId,
						"id",
					),
				]),
			);

			if (!channel) {
				return yield* Effect.die(new Error(`Channel ${channelId} not found`));
			}

			if (existingSettings) {
				yield* db.patch(existingSettings._id, {
					...existingSettings,
					...settings,
					channelId,
					serverId: channel.serverId,
				});
			} else {
				yield* db.insert("channelSettings", {
					...DEFAULT_CHANNEL_SETTINGS,
					...settings,
					channelId,
					serverId: channel.serverId,
				});
			}

			return channelId;
		}).pipe(Effect.orDie),
});

export const findChannelSettingsWithIndexingEnabled = privateQuery({
	args: Schema.Struct({
		serverId: Schema.BigIntFromSelf,
	}),
	returns: Schema.Array(ChannelSettingsWithSystemFields),
	handler: ({ serverId }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const settings = yield* db
				.query("channelSettings")
				.withIndex("by_serverId_and_indexingEnabled", (q) =>
					q.eq("serverId", serverId).eq("indexingEnabled", true),
				)
				.collect();
			return [...settings];
		}),
});

const ServerHeaderDataSchema = Schema.Struct({
	server: Schema.Struct({
		_id: Id.Id("servers"),
		_creationTime: Schema.Number,
		discordId: Schema.BigIntFromSelf,
		name: Schema.String,
		icon: Schema.optional(Schema.String),
		banner: Schema.optional(Schema.String),
		description: Schema.optional(Schema.String),
		vanityInviteCode: Schema.optional(Schema.String),
		kickedTime: Schema.optional(Schema.Number),
		approximateMemberCount: Schema.Number,
		channels: Schema.Array(ChannelWithSystemFields),
		customDomain: Schema.optional(Schema.String),
		subpath: Schema.optional(Schema.String),
		inviteCode: Schema.optional(Schema.String),
	}),
	channels: Schema.Array(ChannelWithSystemFields),
});

async function getServerHeaderData(
	ctx: QueryCtx,
	serverDiscordId: bigint,
): Promise<Schema.Schema.Type<typeof ServerHeaderDataSchema> | null> {
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
			channels: indexedChannels,
			customDomain: serverPreferences?.customDomain,
			subpath: serverPreferences?.subpath,
			inviteCode,
		},
		channels: indexedChannels,
	};
}

const CommunityPageHeaderDataSchema = Schema.extend(
	ServerHeaderDataSchema,
	Schema.Struct({
		selectedChannel: Schema.NullOr(ChannelWithFlags),
	}),
);

export const getCommunityPageHeaderData = privateQuery({
	args: Schema.Struct({
		serverDiscordId: Schema.BigIntFromSelf,
		channelDiscordId: Schema.optional(Schema.BigIntFromSelf),
	}),
	returns: Schema.NullOr(CommunityPageHeaderDataSchema),
	handler: ({ serverDiscordId, channelDiscordId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const headerData = yield* Effect.promise(() =>
				getServerHeaderData(ctx, serverDiscordId),
			);

			if (!headerData) return null;

			if (!channelDiscordId) {
				return {
					...headerData,
					selectedChannel: null,
				};
			}

			const channel = yield* Effect.promise(() =>
				getChannelWithSettings(ctx, channelDiscordId),
			);

			if (!channel || channel.serverId !== headerData.server.discordId) {
				return null;
			}

			return {
				...headerData,
				selectedChannel: channel,
			};
		}),
});

export const resetServerIndexingSnowflakes = oldInternalMutation({
	args: {
		serverId: v.int64(),
	},
	handler: async (ctx, args) => {
		const indexedChannels = await ctx.db
			.query("channelSettings")
			.withIndex("by_serverId_and_indexingEnabled", (q) =>
				q.eq("serverId", args.serverId).eq("indexingEnabled", true),
			)
			.collect();

		await asyncMap(indexedChannels, (channel) =>
			ctx.db.patch(channel._id, {
				lastIndexedSnowflake: undefined,
			}),
		);
	},
});
