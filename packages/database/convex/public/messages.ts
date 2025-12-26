import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { threadMessageCounts } from "../private/counts";
import { enrichMessage, enrichMessages } from "../shared/dataAccess";
import { getThreadStartMessage } from "../shared/messages";
import { publicQuery } from "./custom_functions";

export const getMessages = publicQuery({
	args: {
		channelId: v.int64(),
		after: v.int64(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const { channelId, after, paginationOpts } = args;

		const query = ctx.db
			.query("messages")
			.withIndex("by_channelId_and_id", (q) =>
				q.eq("channelId", channelId).gt("id", after),
			);

		const paginatedResult = await query.order("asc").paginate(paginationOpts);

		const enrichedMessages = await enrichMessages(ctx, paginatedResult.page);

		return {
			page: enrichedMessages,
			isDone: paginatedResult.isDone,
			continueCursor: paginatedResult.continueCursor,
		};
	},
});

export const getMessagePageHeaderData = publicQuery({
	args: {
		messageId: v.int64(),
	},
	handler: async (ctx, args) => {
		const targetMessage = await ctx.cache.getMessage(args.messageId);

		const getThread = async () => {
			if (targetMessage?.parentChannelId) {
				return ctx.cache.getChannel(targetMessage.channelId);
			}
			if (targetMessage?.childThreadId) {
				return ctx.cache.getChannel(targetMessage.childThreadId);
			}
			return ctx.cache.getChannel(args.messageId);
		};

		const thread = await getThread();

		const getRootMessage = async () => {
			if (targetMessage) {
				return targetMessage;
			}
			if (thread?.parentId) {
				return ctx.cache.getMessage(thread.id);
			}
			return getThreadStartMessage(ctx, args.messageId);
		};

		const rootMessage = await getRootMessage();
		const channelId =
			thread?.parentId ??
			rootMessage?.parentChannelId ??
			rootMessage?.channelId;
		const serverId = rootMessage?.serverId ?? thread?.serverId;
		if (!channelId || !serverId) {
			return null;
		}

		const [channel, server, serverPreferences] = await Promise.all([
			ctx.cache.getChannelWithSettings(channelId),
			ctx.cache.getServer(serverId),
			ctx.cache.getServerPreferences(serverId),
		]);

		if (!channel?.flags?.indexingEnabled) {
			console.error("Channel indexing not enabled", channel?.id);
			return null;
		}

		if (!server) {
			console.error("Server not found", channel.serverId);
			return null;
		}

		const getReplyCount = async () => {
			if (!thread?.parentId) return 0;
			const count = await threadMessageCounts.count(ctx, {
				bounds: {
					prefix: [thread.serverId, thread.parentId, thread.id],
				},
			});
			return Math.max(0, count - 1);
		};

		const [enrichedFirst, solutionMessages, replyCount] = await Promise.all([
			rootMessage ? enrichMessage(ctx, rootMessage) : null,
			rootMessage
				? ctx.cache.getSolutionsByQuestionId(rootMessage.id)
				: Promise.resolve([]),
			getReplyCount(),
		]);

		const solutionMsg = solutionMessages[0];
		const solutionMessage = solutionMsg
			? await enrichMessages(ctx, [solutionMsg])
			: [];

		return {
			canonicalId: thread?.id ?? rootMessage?.id ?? args.messageId,
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
	},
});
