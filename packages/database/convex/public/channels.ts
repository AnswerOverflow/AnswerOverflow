import { getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Effect, Option, Predicate, Schema } from "effect";
import { PaginationOpts } from "@packages/confect/server";
import { enrichMessage } from "../shared/dataAccess";
import { getThreadStartMessage } from "../shared/messages";
import { CHANNEL_TYPE, getChannelWithSettings } from "../shared/shared";
import {
	publicQuery as confectPublicQuery,
	ConfectQueryCtx,
	getQueryCtxWithCache,
} from "../client/confectPublic";

const PaginatedResultSchema = Schema.Struct({
	page: Schema.Array(Schema.Unknown),
	isDone: Schema.Boolean,
	continueCursor: Schema.String,
});

export const getChannelPageThreads = confectPublicQuery({
	args: Schema.Struct({
		channelDiscordId: Schema.BigIntFromSelf,
		tagIds: Schema.optional(Schema.Array(Schema.String)),
		paginationOpts: PaginationOpts.PaginationOpts,
	}),
	returns: PaginatedResultSchema,
	handler: ({ channelDiscordId, tagIds, paginationOpts }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const tagIdStrings = tagIds;
			const hasTagFilter = tagIdStrings && tagIdStrings.length > 0;

			if (hasTagFilter) {
				const tagIdsBigInt = [...tagIdStrings].map((id) => BigInt(id));

				const threadIdSets = yield* Effect.all(
					tagIdsBigInt.map((tagId) =>
						Effect.gen(function* () {
							const entries = yield* db
								.query("threadTags")
								.withIndex("by_parentChannelId_and_tagId", (q) =>
									q.eq("parentChannelId", channelDiscordId).eq("tagId", tagId),
								)
								.collect();
							return new Set([...entries].map((e) => e.threadId));
						}),
					),
				);

				const matchingThreadIds = new Set<bigint>();
				for (const set of threadIdSets) {
					for (const id of set) {
						matchingThreadIds.add(id);
					}
				}

				if (matchingThreadIds.size === 0) {
					return { page: [], isDone: true, continueCursor: "" };
				}

				const sortedThreadIds = Array.from(matchingThreadIds).sort((a, b) =>
					a > b ? -1 : a < b ? 1 : 0,
				);

				const cursor = paginationOpts.cursor;
				const numItems = paginationOpts.numItems;
				let startIndex = 0;

				if (cursor) {
					const cursorId = BigInt(cursor);
					startIndex = sortedThreadIds.findIndex((id) => id < cursorId);
					if (startIndex === -1) {
						return { page: [], isDone: true, continueCursor: "" };
					}
				}

				const pageThreadIds = sortedThreadIds.slice(
					startIndex,
					startIndex + numItems,
				);
				const isDone = startIndex + numItems >= sortedThreadIds.length;
				const lastId = pageThreadIds[pageThreadIds.length - 1];
				const continueCursor = isDone || !lastId ? "" : lastId.toString();

				const threads = yield* Effect.promise(() =>
					Promise.all(
						pageThreadIds.map((threadId) =>
							getOneFrom(
								ctx.db,
								"channels",
								"by_discordChannelId",
								threadId,
								"id",
							),
						),
					),
				);

				const validThreads = Arr.filter(threads, Predicate.isNotNull);

				const page = yield* Effect.promise(() =>
					Promise.all(
						validThreads.map(async (thread) => {
							const message = await getThreadStartMessage(
								ctxWithCache,
								thread.id,
							);
							const enrichedMessage = message
								? await enrichMessage(ctxWithCache, message)
								: null;

							return {
								thread,
								message: enrichedMessage,
							};
						}),
					),
				);

				return {
					page,
					isDone,
					continueCursor,
				};
			}

			const paginatedResult = yield* db
				.query("channels")
				.withIndex("by_parentId_and_id", (q) =>
					q.eq("parentId", channelDiscordId),
				)
				.order("desc")
				.paginate(paginationOpts);

			const threads = [...paginatedResult.page];

			const page = yield* Effect.promise(() =>
				Promise.all(
					threads.map(async (thread) => {
						const message = await getThreadStartMessage(
							ctxWithCache,
							thread.id,
						);
						const enrichedMessage = message
							? await enrichMessage(ctxWithCache, message)
							: null;

						return {
							thread,
							message: enrichedMessage,
						};
					}),
				),
			);

			return {
				page,
				isDone: paginatedResult.isDone,
				continueCursor: paginatedResult.continueCursor,
			};
		}),
});

export const getChannelPageMessages = confectPublicQuery({
	args: Schema.Struct({
		channelDiscordId: Schema.BigIntFromSelf,
		paginationOpts: PaginationOpts.PaginationOpts,
	}),
	returns: PaginatedResultSchema,
	handler: ({ channelDiscordId, paginationOpts }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const paginatedResult = yield* db
				.query("messages")
				.withIndex("by_channelId_and_id", (q) =>
					q.eq("channelId", channelDiscordId),
				)
				.order("desc")
				.paginate(paginationOpts);

			const page = yield* Effect.promise(() =>
				Promise.all(
					[...paginatedResult.page].map(async (message) => {
						const enrichedMessage = await enrichMessage(ctxWithCache, message);
						return {
							message: enrichedMessage,
						};
					}),
				),
			);

			return {
				page,
				isDone: paginatedResult.isDone,
				continueCursor: paginatedResult.continueCursor,
			};
		}),
});

export const getServerPageThreads = confectPublicQuery({
	args: Schema.Struct({
		serverDiscordId: Schema.BigIntFromSelf,
		paginationOpts: PaginationOpts.PaginationOpts,
	}),
	returns: PaginatedResultSchema,
	handler: ({ serverDiscordId, paginationOpts }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const serverOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", serverDiscordId))
				.first();

			if (Option.isNone(serverOption)) {
				return { page: [], isDone: true, continueCursor: "" };
			}

			const server = serverOption.value;

			const indexedSettings = yield* db
				.query("channelSettings")
				.withIndex("by_serverId_and_indexingEnabled", (q) =>
					q.eq("serverId", server.discordId).eq("indexingEnabled", true),
				)
				.collect();

			const indexedChannelIds = [...indexedSettings].map((s) => s.channelId);

			const indexedChannels = yield* Effect.promise(() =>
				Promise.all(
					indexedChannelIds.map((channelId) =>
						getOneFrom(
							ctx.db,
							"channels",
							"by_discordChannelId",
							channelId,
							"id",
						),
					),
				),
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

			const paginatedResult = yield* db
				.query("channels")
				.withIndex("by_serverId", (q) => q.eq("serverId", server.discordId))
				.order("desc")
				.paginate(paginationOpts);

			const threads = Arr.filter(
				[...paginatedResult.page],
				(channel) =>
					channel.parentId !== undefined &&
					indexedChannelIds.includes(channel.parentId),
			);

			const page = yield* Effect.promise(() =>
				Promise.all(
					threads.map(async (thread) => {
						const channel = thread.parentId
							? (channelIdToInfo.get(thread.parentId) ?? null)
							: null;

						const message = await getThreadStartMessage(
							ctxWithCache,
							thread.id,
						);
						const enrichedMessage = message
							? await enrichMessage(ctxWithCache, message)
							: null;

						return {
							thread,
							message: enrichedMessage,
							channel,
						};
					}),
				),
			);

			return {
				page,
				isDone: paginatedResult.isDone,
				continueCursor: paginatedResult.continueCursor,
			};
		}),
});

const CommunityPageHeaderDataSchema = Schema.Struct({
	server: Schema.Unknown,
	channels: Schema.Array(Schema.Unknown),
	selectedChannel: Schema.NullOr(Schema.Unknown),
});

export const getCommunityPageHeaderData = confectPublicQuery({
	args: Schema.Struct({
		serverDiscordId: Schema.BigIntFromSelf,
		channelDiscordId: Schema.optional(Schema.BigIntFromSelf),
	}),
	returns: Schema.NullOr(CommunityPageHeaderDataSchema),
	handler: ({ serverDiscordId, channelDiscordId }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;

			const serverOption = yield* db
				.query("servers")
				.withIndex("by_discordId", (q) => q.eq("discordId", serverDiscordId))
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

			const indexedChannelIds = [...indexedSettings].map((s) => s.channelId);

			const allIndexedChannels = yield* Effect.promise(() =>
				Promise.all(
					indexedChannelIds.map((channelId) =>
						getOneFrom(
							ctx.db,
							"channels",
							"by_discordChannelId",
							channelId,
							"id",
						),
					),
				),
			);

			const indexedChannels = Arr.filter(
				allIndexedChannels,
				Predicate.isNotNull,
			)
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

			const channelInviteCode = [...indexedSettings].find(
				(s) => s.inviteCode,
			)?.inviteCode;
			const inviteCode = server.vanityInviteCode ?? channelInviteCode;

			const headerData = {
				server: {
					...server,
					customDomain: serverPreferences?.customDomain,
					subpath: serverPreferences?.subpath,
					inviteCode,
				},
				channels: indexedChannels,
			};

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
