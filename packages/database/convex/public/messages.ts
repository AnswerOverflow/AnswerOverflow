import { type Infer, v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { type MutationCtx, type QueryCtx, query } from "../_generated/server";
import type {
	attachmentSchema,
	messageSchema,
	reactionSchema,
} from "../schema";
import {
	findAttachmentsByMessageId as findAttachmentsByMessageIdShared,
	findIgnoredDiscordAccountById,
	findMessagesByChannelId as findMessagesByChannelIdShared,
	findReactionsByMessageId as findReactionsByMessageIdShared,
	findSolutionsByQuestionId as findSolutionsByQuestionIdShared,
	getChannelWithSettings,
	getDiscordAccountById,
	getMessageById as getMessageByIdShared,
	isThreadType,
} from "../shared/shared";

type Message = Infer<typeof messageSchema>;
type Attachment = Infer<typeof attachmentSchema>;
type Reaction = Infer<typeof reactionSchema>;

// Helper functions for message thread/channel resolution
function getThreadIdOfMessage(
	message: Pick<Message, "childThreadId" | "parentChannelId" | "channelId">,
): string | null {
	if (message.childThreadId) {
		return message.childThreadId;
	}
	if (message.parentChannelId) {
		return message.channelId;
	}
	return null;
}

function getParentChannelOfMessage(
	message: Pick<Message, "parentChannelId" | "channelId">,
): string {
	return message.parentChannelId ?? message.channelId;
}

// Helper function to check if an account is ignored
async function isIgnoredAccount(
	ctx: QueryCtx | MutationCtx,
	authorId: string,
): Promise<boolean> {
	const ignoredAccount = await findIgnoredDiscordAccountById(ctx, authorId);
	return ignoredAccount !== null;
}

export const getMessageById = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await getMessageByIdShared(ctx, args.id);
	},
});

export const findMessagesByChannelId = query({
	args: {
		channelId: v.string(),
		limit: v.optional(v.number()),
		after: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		return await findMessagesByChannelIdShared(
			ctx,
			args.channelId,
			args.limit,
			args.after,
		);
	},
});

export const findMessagesByAuthorId = query({
	args: {
		authorId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", args.authorId))
			.collect();

		return messages.slice(0, args.limit ?? 100);
	},
});

export const getMessagePageData = query({
	args: {
		messageId: v.string(),
	},
	handler: async (
		ctx,
		args,
	): Promise<{
		messages: Array<{
			message: Message;
			author: { id: string; name: string; avatar?: string } | null;
			attachments: Attachment[];
			reactions: Reaction[];
			solutions: Message[];
		}>;
		server: {
			_id: Id<"servers">;
			discordId: string;
			name: string;
			icon?: string;
			description?: string;
		};
		channel: { id: string; name: string; type: number };
		thread: { id: string; name: string; type: number } | null;
	} | null> => {
		// Get the target message
		const targetMessage = await getMessageByIdShared(ctx, args.messageId);

		if (!targetMessage) {
			return null;
		}

		// Get server
		const server = await ctx.db.get(targetMessage.serverId);
		if (!server) {
			return null;
		}

		// Determine thread and parent channel
		const threadId = getThreadIdOfMessage(targetMessage);
		const parentId = getParentChannelOfMessage(targetMessage);

		// Get channel info
		const channelId = threadId ?? parentId;
		const channel = await getChannelWithSettings(ctx, channelId);

		if (!channel) {
			return null;
		}

		// Get thread if it exists
		let thread: { id: string; name: string; type: number } | null = null;
		if (threadId && threadId !== channelId) {
			const threadChannel = await getChannelWithSettings(ctx, threadId);
			if (threadChannel) {
				thread = {
					id: threadChannel.id,
					name: threadChannel.name,
					type: channel.type,
				};
			}
		}

		// Get all messages in the thread/channel
		const allMessages = await findMessagesByChannelIdShared(
			ctx,
			threadId ?? parentId,
			threadId ? undefined : 50, // Limit for non-thread channels
		);

		// Filter messages - if not a thread, only get messages >= target message ID
		const messagesToShow = threadId
			? allMessages
			: allMessages.filter((m) => m.id >= targetMessage.id);

		// Get all author IDs
		const authorIds = new Set(messagesToShow.map((m) => m.authorId));

		// Get all Discord accounts
		const authors = await Promise.all(
			Array.from(authorIds).map((id) => getDiscordAccountById(ctx, id)),
		);

		const authorMap = new Map(
			authors
				.filter((a): a is NonNullable<typeof a> => a !== null)
				.map((a) => [a.id, a]),
		);

		// Get attachments, reactions, and solutions for each message
		const messagesWithData = await Promise.all(
			messagesToShow.map(async (message) => {
				const [attachments, reactions, solutions] = await Promise.all([
					findAttachmentsByMessageIdShared(ctx, message.id),
					findReactionsByMessageIdShared(ctx, message.id),
					message.questionId
						? findSolutionsByQuestionIdShared(ctx, message.questionId)
						: [],
				]);

				const author = authorMap.get(message.authorId);
				return {
					message,
					author: author
						? {
								id: author.id,
								name: author.name,
								avatar: author.avatar,
							}
						: null,
					attachments,
					reactions,
					solutions,
				};
			}),
		);

		if (!server) {
			throw new Error("Server not found");
		}

		return {
			messages: messagesWithData,
			server: {
				_id: server._id as Id<"servers">,
				discordId: server.discordId,
				name: server.name,
				icon: server.icon,
				description: server.description,
			},
			channel: {
				id: channel.id,
				name: channel.name,
				type: channel.type,
			},
			thread,
		};
	},
});

export const searchMessages = query({
	args: {
		query: v.string(),
		serverId: v.optional(v.id("servers")),
		channelId: v.optional(v.string()),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Build search query - Convex search indexes only support searching on the searchField
		// We'll filter by serverId/channelId after the search
		let searchQuery = ctx.db
			.query("messages")
			.withSearchIndex("search_content", (q) =>
				q.search("content", args.query),
			);

		// Filter by server if provided (using regular filter after search)
		if (args.serverId) {
			searchQuery = searchQuery.filter((q) =>
				q.eq(q.field("serverId"), args.serverId),
			);
		}

		// Filter by channel if provided
		// Include both direct messages in the channel and messages in threads belonging to the channel
		if (args.channelId) {
			searchQuery = searchQuery.filter((q) =>
				q.or(
					q.eq(q.field("channelId"), args.channelId),
					q.eq(q.field("parentChannelId"), args.channelId),
				),
			);
		}

		// Get results with limit
		const results = await searchQuery.take(args.limit ?? 20);

		// Filter out messages from ignored accounts and check indexing enabled
		const filteredResults: Array<{ message: Message; score: number }> = [];
		for (const message of results) {
			const isIgnored = await isIgnoredAccount(ctx, message.authorId);
			if (!isIgnored) {
				// Check if channel has indexing enabled
				// For thread messages, check parent channel settings if thread doesn't have its own
				const channel = await getChannelWithSettings(ctx, message.channelId);
				let indexingEnabled = channel?.flags.indexingEnabled ?? false;

				// If message is in a thread and thread doesn't have indexing enabled,
				// check the parent channel's settings
				if (
					!indexingEnabled &&
					message.parentChannelId &&
					channel &&
					isThreadType(channel.type)
				) {
					const parentChannel = await getChannelWithSettings(
						ctx,
						message.parentChannelId,
					);
					indexingEnabled = parentChannel?.flags.indexingEnabled ?? false;
				}

				if (indexingEnabled) {
					// For now, use a simple score based on position (Convex doesn't expose search scores directly)
					// In a real implementation, you might want to use vector search for better scoring
					filteredResults.push({
						message,
						score: 1.0 - filteredResults.length * 0.01, // Simple decreasing score
					});
				}
			}
		}

		return filteredResults;
	},
});
