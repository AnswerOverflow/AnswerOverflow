import { Effect, Schema } from "effect";
import { PaginationOpts } from "@packages/confect/server";
import { threadMessageCounts } from "../private/counts";
import { enrichMessage, enrichMessages } from "../shared/dataAccess";
import { getThreadStartMessage } from "../shared/messages";
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

export const getMessages = confectPublicQuery({
	args: Schema.Struct({
		channelId: Schema.BigIntFromSelf,
		after: Schema.BigIntFromSelf,
		paginationOpts: PaginationOpts.PaginationOpts,
	}),
	returns: PaginatedResultSchema,
	handler: ({ channelId, after, paginationOpts }) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;

			const paginatedResult = yield* db
				.query("messages")
				.withIndex("by_channelId_and_id", (q) =>
					q.eq("channelId", channelId).gt("id", after),
				)
				.order("asc")
				.paginate(paginationOpts);

			const enrichedMessages = yield* Effect.promise(() =>
				enrichMessages(ctxWithCache, [...paginatedResult.page]),
			);

			return {
				page: enrichedMessages,
				isDone: paginatedResult.isDone,
				continueCursor: paginatedResult.continueCursor,
			};
		}),
});

const MessagePageHeaderDataSchema = Schema.NullOr(
	Schema.Struct({
		canonicalId: Schema.BigIntFromSelf,
		firstMessage: Schema.NullOr(Schema.Unknown),
		solutionMessage: Schema.NullOr(Schema.Unknown),
		channelId: Schema.BigIntFromSelf,
		threadId: Schema.NullOr(Schema.BigIntFromSelf),
		replyCount: Schema.Number,
		server: Schema.Struct({
			_id: Schema.Unknown,
			discordId: Schema.BigIntFromSelf,
			name: Schema.String,
			icon: Schema.optional(Schema.String),
			banner: Schema.optional(Schema.String),
			description: Schema.optional(Schema.String),
			approximateMemberCount: Schema.optional(Schema.Number),
			customDomain: Schema.optional(Schema.String),
			subpath: Schema.optional(Schema.String),
			vanityInviteCode: Schema.optional(Schema.String),
		}),
		channel: Schema.Struct({
			id: Schema.BigIntFromSelf,
			name: Schema.String,
			type: Schema.Number,
			inviteCode: Schema.optional(Schema.String),
			availableTags: Schema.optional(Schema.Unknown),
		}),
		thread: Schema.NullOr(Schema.Unknown),
	}),
);

export const getMessagePageHeaderData = confectPublicQuery({
	args: Schema.Struct({
		messageId: Schema.BigIntFromSelf,
	}),
	returns: MessagePageHeaderDataSchema,
	handler: ({ messageId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;
			const ctxWithCache = yield* getQueryCtxWithCache;
			const cache = ctxWithCache.cache;

			const targetMessage = yield* Effect.promise(() =>
				cache.getMessage(messageId),
			);

			const getThread = () =>
				Effect.gen(function* () {
					if (targetMessage?.parentChannelId) {
						return yield* Effect.promise(() =>
							cache.getChannel(targetMessage.channelId),
						);
					}
					const childThreadId = targetMessage?.childThreadId;
					if (childThreadId !== undefined) {
						return yield* Effect.promise(() => cache.getChannel(childThreadId));
					}
					return yield* Effect.promise(() => cache.getChannel(messageId));
				});

			const thread = yield* getThread();

			const getRootMessage = () =>
				Effect.gen(function* () {
					if (targetMessage) {
						return targetMessage;
					}
					if (thread?.parentId) {
						return yield* Effect.promise(() => cache.getMessage(thread.id));
					}
					return yield* Effect.promise(() =>
						getThreadStartMessage(ctxWithCache, messageId),
					);
				});

			const rootMessage = yield* getRootMessage();
			const channelId =
				thread?.parentId ??
				rootMessage?.parentChannelId ??
				rootMessage?.channelId;
			const serverId = rootMessage?.serverId ?? thread?.serverId;
			if (!channelId || !serverId) {
				return null;
			}

			const [channel, server, serverPreferences] = yield* Effect.all([
				Effect.promise(() => cache.getChannelWithSettings(channelId)),
				Effect.promise(() => cache.getServer(serverId)),
				Effect.promise(() => cache.getServerPreferences(serverId)),
			]);

			if (!channel?.flags?.indexingEnabled) {
				console.error("Channel indexing not enabled", channel?.id);
				return null;
			}

			if (!server) {
				console.error("Server not found", channel.serverId);
				return null;
			}

			const getReplyCount = () =>
				Effect.gen(function* () {
					const parentId = thread?.parentId;
					if (!parentId) return 0;
					const count = yield* Effect.promise(() =>
						threadMessageCounts.count(ctx, {
							namespace: undefined,
							bounds: {
								prefix: [thread.serverId, parentId, thread.id],
							},
						}),
					);
					return Math.max(0, count - 1);
				});

			const [enrichedFirst, solutionMessages, replyCount] = yield* Effect.all([
				rootMessage
					? Effect.promise(() => enrichMessage(ctxWithCache, rootMessage))
					: Effect.succeed(null),
				rootMessage
					? Effect.promise(() => cache.getSolutionsByQuestionId(rootMessage.id))
					: Effect.succeed([]),
				getReplyCount(),
			]);

			const solutionMsg = solutionMessages[0];
			const solutionMessage = solutionMsg
				? yield* Effect.promise(() =>
						enrichMessages(ctxWithCache, [solutionMsg]),
					)
				: [];

			return {
				canonicalId: thread?.id ?? rootMessage?.id ?? messageId,
				firstMessage: enrichedFirst,
				solutionMessage: solutionMessage[0] ?? null,
				channelId,
				threadId: thread?.id ?? null,
				replyCount,
				server: {
					_id: server._id,
					discordId: server.discordId,
					name: server.name,
					icon: server.icon,
					banner: server.banner,
					description: server.description,
					approximateMemberCount: server.approximateMemberCount,
					customDomain: serverPreferences?.customDomain,
					subpath: serverPreferences?.subpath,
					vanityInviteCode: server.vanityInviteCode,
				},
				channel: {
					id: channel.id,
					name: channel.name,
					type: channel.type,
					inviteCode: channel.flags.inviteCode,
					availableTags: channel.availableTags,
				},
				thread,
			};
		}),
});
