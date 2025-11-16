import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import {
	CHANNEL_TYPE,
	enrichMessagesWithData,
	findAttachmentsByMessageId,
	findReactionsByMessageId,
	getDiscordAccountById,
	getFirstMessagesInChannels,
} from "../shared/shared";
import { publicQuery } from "./custom_functions";

export const publicSearch = publicQuery({
	args: {
		query: v.string(),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const paginationOpts = {
			...args.paginationOpts,
			numItems: Math.min(args.paginationOpts.numItems, 10),
		};
		const paginatedResult = await ctx.db
			.query("messages")
			.withSearchIndex("search_content", (q) => q.search("content", args.query))
			.paginate(paginationOpts);
		const messagesWithData = await enrichMessagesWithData(
			ctx,
			paginatedResult.page,
		);

		return {
			...paginatedResult,
			page: messagesWithData,
		};
	},
});

export const getRecentThreads = publicQuery({
	args: {
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, args) => {
		const paginatedResult = await ctx.db
			.query("channels")
			.withIndex("by_type", (q) => q.eq("type", CHANNEL_TYPE.PublicThread))
			.order("desc")
			.paginate(args.paginationOpts);

		const threads = paginatedResult.page;

		if (threads.length === 0) {
			return {
				...paginatedResult,
				page: [],
			};
		}

		const threadIds = threads.map((t) => t.id);
		const firstMessages = await getFirstMessagesInChannels(ctx, threadIds);

		const threadsWithMessages = threads
			.map((thread) => ({
				thread,
				message: firstMessages[thread.id] ?? null,
			}))
			.filter(
				(
					tm,
				): tm is {
					thread: typeof tm.thread;
					message: NonNullable<typeof tm.message>;
				} => tm.message !== null,
			);

		if (threadsWithMessages.length === 0) {
			return {
				...paginatedResult,
				page: [],
			};
		}

		const serverIds = new Set(
			threadsWithMessages.map((tm) => tm.message.serverId),
		);
		const servers = await asyncMap(Array.from(serverIds), (id) =>
			ctx.db.get(id),
		);
		const serverMap = new Map(
			servers
				.filter((s): s is NonNullable<(typeof servers)[0]> => s !== null)
				.map((s) => [s._id, s]),
		);

		const authorIds = new Set(
			threadsWithMessages.map((tm) => tm.message.authorId),
		);
		const authors = await asyncMap(Array.from(authorIds), (id) =>
			getDiscordAccountById(ctx, id),
		);
		const authorMap = new Map(
			authors
				.filter((a): a is NonNullable<typeof a> => a !== null)
				.map((a) => [a.id, a]),
		);

		const parentChannelIds = new Set(
			threadsWithMessages
				.map((tm) => tm.thread.parentId)
				.filter((id): id is string => id !== undefined),
		);
		const parentChannels = await asyncMap(Array.from(parentChannelIds), (id) =>
			ctx.db
				.query("channels")
				.withIndex("by_discordChannelId", (q) => q.eq("id", id))
				.first(),
		);
		const parentChannelMap = new Map(
			parentChannels
				.filter((c): c is NonNullable<typeof c> => c !== null)
				.map((c) => [c.id, c]),
		);

		const page = await asyncMap(
			threadsWithMessages,
			async ({ thread, message }) => {
				const server = serverMap.get(message.serverId);
				const author = authorMap.get(message.authorId);
				const parentChannel = thread.parentId
					? parentChannelMap.get(thread.parentId)
					: null;

				const [attachments, reactions] = await Promise.all([
					findAttachmentsByMessageId(ctx, message.id),
					findReactionsByMessageId(ctx, message.id),
				]);

				return {
					thread: {
						id: thread.id,
						name: thread.name,
						serverId: thread.serverId,
						type: thread.type,
						parentId: thread.parentId,
						inviteCode: thread.inviteCode,
						archivedTimestamp: thread.archivedTimestamp,
						solutionTagId: thread.solutionTagId,
						lastIndexedSnowflake: thread.lastIndexedSnowflake,
					},
					parentChannel: parentChannel
						? {
								id: parentChannel.id,
								name: parentChannel.name,
								type: parentChannel.type,
							}
						: null,
					message,
					attachments,
					reactions,
					server: server
						? {
								id: server._id,
								discordId: server.discordId,
								name: server.name,
								icon: server.icon,
							}
						: null,
					author: author
						? {
								id: author.id,
								name: author.name,
								avatar: author.avatar,
							}
						: null,
				};
			},
		);

		return {
			...paginatedResult,
			page,
		};
	},
});
