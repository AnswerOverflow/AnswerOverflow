import { getOneFrom } from "convex-helpers/server/relationships";
import { Effect, Schema } from "effect";
import { PaginationOpts } from "@packages/confect/server";
import {
	enrichMessagesWithServerAndChannels,
	type SearchResult,
} from "../shared/dataAccess";
import { getDiscordAccountById as getDiscordAccountByIdShared } from "../shared/shared";
import {
	publicQuery as confectPublicQuery,
	ConfectQueryCtx,
	getQueryCtxWithCache,
} from "../client/confectPublic";

const PaginatedSearchResultsSchema = Schema.Struct({
	page: Schema.Array(Schema.Unknown),
	isDone: Schema.Boolean,
	continueCursor: Schema.String,
});

export const getUserPosts = confectPublicQuery({
	args: Schema.Struct({
		userId: Schema.BigIntFromSelf,
		serverId: Schema.optional(Schema.BigIntFromSelf),
		paginationOpts: PaginationOpts.PaginationOpts,
	}),
	returns: PaginatedSearchResultsSchema,
	handler: ({ userId, serverId, paginationOpts }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const serverIdFilter = serverId ?? null;

			const paginatedResult = yield* db
				.query("messages")
				.withIndex("by_authorId_and_childThreadId", (q) =>
					q.eq("authorId", userId).gte("childThreadId", 0n),
				)
				.order("desc")
				.paginate(paginationOpts);

			const filteredMessages = serverIdFilter
				? [...paginatedResult.page].filter((m) => m.serverId === serverIdFilter)
				: [...paginatedResult.page];

			const enrichedPosts = yield* Effect.promise(() =>
				enrichMessagesWithServerAndChannels(ctxWithCache, filteredMessages),
			);

			return {
				page: enrichedPosts,
				isDone: paginatedResult.isDone,
				continueCursor: paginatedResult.continueCursor,
			};
		}),
});

const UserPageHeaderDataSchema = Schema.Struct({
	user: Schema.Struct({
		id: Schema.String,
		name: Schema.String,
		avatar: Schema.optional(Schema.String),
	}),
	servers: Schema.Array(Schema.Unknown),
});

export const getUserPageHeaderData = confectPublicQuery({
	args: Schema.Struct({
		userId: Schema.BigIntFromSelf,
	}),
	returns: Schema.NullOr(UserPageHeaderDataSchema),
	handler: ({ userId }) =>
		Effect.gen(function* () {
			const { ctx, db } = yield* ConfectQueryCtx;

			const user = yield* Effect.promise(() =>
				getDiscordAccountByIdShared(ctx, userId),
			);

			if (!user) {
				return null;
			}

			const userServerSettings = yield* db
				.query("userServerSettings")
				.withIndex("by_userId", (q) => q.eq("userId", userId))
				.collect();

			const serverPreferences = yield* Effect.all(
				[...userServerSettings].map((setting) =>
					Effect.promise(() =>
						getOneFrom(
							ctx.db,
							"serverPreferences",
							"by_serverId",
							setting.serverId,
						),
					),
				),
			);

			const isPublic =
				[...userServerSettings].some(
					(userServerSetting) => userServerSetting.canPubliclyDisplayMessages,
				) ||
				serverPreferences.some(
					(serverPreference) =>
						serverPreference?.considerAllMessagesPublicEnabled &&
						!serverPreference.anonymizeMessagesEnabled,
				);

			if (!isPublic) {
				return null;
			}

			return {
				user: {
					id: user.id.toString(),
					name: user.name,
					avatar: user.avatar,
				},
				servers: [],
			};
		}),
});
