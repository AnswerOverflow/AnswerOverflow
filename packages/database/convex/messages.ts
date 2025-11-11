import { type Infer, v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import {
	internalMutation,
	type MutationCtx,
	mutation,
	type QueryCtx,
	query,
} from "./_generated/server";
import {
	attachmentSchema,
	emojiSchema,
	messageSchema,
	type reactionSchema,
} from "./schema";
import {
	deleteMessageInternalLogic,
	findAttachmentsByMessageId as findAttachmentsByMessageIdShared,
	findIgnoredDiscordAccountById,
	findMessagesByChannelId as findMessagesByChannelIdShared,
	findReactionsByMessageId as findReactionsByMessageIdShared,
	findSolutionsByQuestionId as findSolutionsByQuestionIdShared,
	findUserServerSettingsById,
	getChannelWithSettings,
	getDiscordAccountById,
	getMessageById as getMessageByIdShared,
	upsertMessageInternalLogic,
} from "./shared";

type Message = Infer<typeof messageSchema>;
type Attachment = Infer<typeof attachmentSchema>;
type Reaction = Infer<typeof reactionSchema>;

// Helper function to check if an account is ignored
async function isIgnoredAccount(
	ctx: QueryCtx | MutationCtx,
	authorId: string,
): Promise<boolean> {
	const ignoredAccount = await findIgnoredDiscordAccountById(ctx, authorId);
	return ignoredAccount !== null;
}

// Helper function to check if message indexing is disabled for a user
async function hasMessageIndexingDisabled(
	ctx: QueryCtx | MutationCtx,
	authorId: string,
	serverId: Id<"servers">,
): Promise<boolean> {
	const settings = await findUserServerSettingsById(ctx, authorId, serverId);
	return settings?.messageIndexingDisabled === true;
}

export const upsertMessage = mutation({
	args: {
		message: messageSchema,
		attachments: v.optional(v.array(attachmentSchema)),
		reactions: v.optional(
			v.array(
				v.object({
					userId: v.string(),
					emoji: emojiSchema,
				}),
			),
		),
		ignoreChecks: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		if (!args.ignoreChecks) {
			const ignored = await isIgnoredAccount(ctx, args.message.authorId);
			if (ignored) {
				throw new Error("Message author is deleted, cannot upsert message");
			}

			const indexingDisabled = await hasMessageIndexingDisabled(
				ctx,
				args.message.authorId,
				args.message.serverId,
			);
			if (indexingDisabled) {
				throw new Error(
					"Message author has disabled message indexing, cannot upsert message",
				);
			}
		}

		const { attachments, reactions } = args;
		const messageData = args.message;

		// Upsert message
		const existing = await ctx.db
			.query("messages")
			.filter((q) => q.eq(q.field("id"), messageData.id))
			.first();

		if (existing) {
			await ctx.db.patch(existing._id, messageData);
		} else {
			await ctx.db.insert("messages", messageData);
		}

		// Handle attachments
		if (attachments !== undefined) {
			// Delete existing attachments
			const existingAttachments = await ctx.db
				.query("attachments")
				.withIndex("by_messageId", (q) => q.eq("messageId", messageData.id))
				.collect();

			for (const attachment of existingAttachments) {
				await ctx.db.delete(attachment._id);
			}

			// Insert new attachments
			if (attachments.length > 0) {
				for (const attachment of attachments) {
					await ctx.db.insert("attachments", attachment);
				}
			}
		}

		// Handle reactions
		if (reactions !== undefined) {
			// Delete existing reactions
			const existingReactions = await ctx.db
				.query("reactions")
				.withIndex("by_messageId", (q) => q.eq("messageId", messageData.id))
				.collect();

			for (const reaction of existingReactions) {
				await ctx.db.delete(reaction._id);
			}

			// Insert emojis and reactions
			if (reactions.length > 0) {
				const emojiSet = new Set<string>();
				for (const reaction of reactions) {
					emojiSet.add(reaction.emoji.id);
				}

				// Upsert emojis
				for (const reaction of reactions) {
					const emojiId = reaction.emoji.id;
					if (!emojiId) continue;

					const existingEmoji = await ctx.db
						.query("emojis")
						.filter((q) => q.eq(q.field("id"), emojiId))
						.first();

					if (!existingEmoji) {
						await ctx.db.insert("emojis", reaction.emoji);
					}
				}

				// Insert reactions
				for (const reaction of reactions) {
					if (!reaction.emoji.id) continue;
					await ctx.db.insert("reactions", {
						messageId: messageData.id,
						userId: reaction.userId,
						emojiId: reaction.emoji.id,
					});
				}
			}
		}

		return null;
	},
});

export const upsertManyMessages = mutation({
	args: {
		messages: v.array(
			v.object({
				message: messageSchema,
				attachments: v.optional(v.array(attachmentSchema)),
				reactions: v.optional(
					v.array(
						v.object({
							userId: v.string(),
							emoji: emojiSchema,
						}),
					),
				),
			}),
		),
		ignoreChecks: v.optional(v.boolean()),
	},
	handler: async (ctx, args) => {
		if (args.messages.length === 0) return null;

		// Check ignored accounts and indexing disabled if needed
		if (!args.ignoreChecks) {
			const authorIds = new Set(args.messages.map((m) => m.message.authorId));
			const ignoredAccounts = await Promise.all(
				Array.from(authorIds).map((id) => isIgnoredAccount(ctx, id)),
			);

			const ignoredAccountIds = new Set(
				Array.from(authorIds).filter((_, idx) => ignoredAccounts[idx]),
			);

			// Filter out messages from ignored accounts
			const messagesToProcess = args.messages.filter(
				(msg) => !ignoredAccountIds.has(msg.message.authorId),
			);

			// Check for indexing disabled
			const messagesToUpsert: typeof args.messages = [];
			for (const msg of messagesToProcess) {
				const indexingDisabled = await hasMessageIndexingDisabled(
					ctx,
					msg.message.authorId,
					msg.message.serverId,
				);
				if (!indexingDisabled) {
					messagesToUpsert.push(msg);
				}
			}

			// Process messages
			for (const msgData of messagesToUpsert) {
				await upsertMessageInternalLogic(ctx, {
					message: msgData.message,
					attachments: msgData.attachments,
					reactions: msgData.reactions,
				});
			}
		} else {
			// Process all messages without checks
			for (const msgData of args.messages) {
				await upsertMessageInternalLogic(ctx, {
					message: msgData.message,
					attachments: msgData.attachments,
					reactions: msgData.reactions,
				});
			}
		}

		return null;
	},
});

export const upsertMessageInternal = internalMutation({
	args: {
		message: messageSchema,
		attachments: v.optional(v.array(attachmentSchema)),
		reactions: v.optional(
			v.array(
				v.object({
					userId: v.string(),
					emoji: emojiSchema,
				}),
			),
		),
	},
	handler: async (ctx, args) => {
		await upsertMessageInternalLogic(ctx, {
			message: args.message,
			attachments: args.attachments,
			reactions: args.reactions,
		});
		return null;
	},
});

/**
 * Public query: Get message by ID
 * No authentication required - returns public message data
 * Note: Privacy filtering should be handled at the application level based on server settings
 */
export const getMessageById = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await getMessageByIdShared(ctx, args.id);
	},
});

/**
 * Public query: Find messages by channel ID
 * No authentication required - returns public message data
 * Note: Privacy filtering should be handled at the application level based on server settings
 */
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

export const findManyMessagesById = query({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.ids.length === 0) return [];

		const messages: Message[] = [];
		for (const id of args.ids) {
			const message = await ctx.db
				.query("messages")
				.filter((q) => q.eq(q.field("id"), id))
				.first();
			if (message) {
				messages.push(message);
			}
		}
		return messages;
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

export const findMessagesByServerId = query({
	args: {
		serverId: v.id("servers"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.collect();

		return messages.slice(0, args.limit ?? 100);
	},
});

export const findMessagesByParentChannelId = query({
	args: {
		parentChannelId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_parentChannelId", (q) =>
				q.eq("parentChannelId", args.parentChannelId),
			)
			.collect();

		return messages.slice(0, args.limit ?? 100);
	},
});

export const findLatestMessageInChannel = query({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
			.collect();

		if (messages.length === 0) return null;

		// Sort by ID (which is a snowflake, so higher = newer)
		messages.sort((a, b) => {
			return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
		});

		return messages[0] ?? null;
	},
});

export const findLatestMessageInChannelAndThreads = query({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		// Get messages in the channel
		const channelMessages = await ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
			.collect();

		// Get messages in threads (where parentChannelId matches)
		const threadMessages = await ctx.db
			.query("messages")
			.withIndex("by_parentChannelId", (q) =>
				q.eq("parentChannelId", args.channelId),
			)
			.collect();

		// Combine and find latest
		const allMessages = [...channelMessages, ...threadMessages];
		if (allMessages.length === 0) return null;

		// Sort by ID (which is a snowflake, so higher = newer)
		allMessages.sort((a, b) => {
			return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
		});

		return allMessages[0] ?? null;
	},
});

export const findAttachmentsByMessageId = query({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		return await findAttachmentsByMessageIdShared(ctx, args.messageId);
	},
});

export const findReactionsByMessageId = query({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		return await findReactionsByMessageIdShared(ctx, args.messageId);
	},
});

export const findEmojiById = query({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("emojis")
			.filter((q) => q.eq(q.field("id"), args.id))
			.first();
	},
});

export const countMessagesInChannel = query({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
			.collect();

		return messages.length;
	},
});

export const countMessagesInManyChannels = query({
	args: {
		channelIds: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		if (args.channelIds.length === 0) return [];

		const results: Array<{ channelId: string; count: number }> = [];

		for (const channelId of args.channelIds) {
			const messages = await ctx.db
				.query("messages")
				.withIndex("by_channelId", (q) => q.eq("channelId", channelId))
				.collect();

			results.push({ channelId, count: messages.length });
		}

		return results;
	},
});

export const getTotalMessageCount = query({
	args: {},
	handler: async (ctx) => {
		const messages = await ctx.db.query("messages").collect();
		return messages.length;
	},
});

export const findSolutionsByQuestionId = query({
	args: {
		questionId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await findSolutionsByQuestionIdShared(
			ctx,
			args.questionId,
			args.limit,
		);
	},
});

export const getTopQuestionSolversByServerId = query({
	args: {
		serverId: v.id("servers"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Get all messages in the server
		const allMessages = await ctx.db
			.query("messages")
			.withIndex("by_serverId", (q) => q.eq("serverId", args.serverId))
			.collect();

		// Filter to only solutions (messages with questionId)
		const solutions = allMessages.filter((msg) => msg.questionId !== undefined);

		// Group by authorId and count
		const solutionCounts = new Map<string, number>();
		for (const solution of solutions) {
			const current = solutionCounts.get(solution.authorId) ?? 0;
			solutionCounts.set(solution.authorId, current + 1);
		}

		// Convert to array and sort by count descending
		const topSolvers = Array.from(solutionCounts.entries())
			.map(([authorId, count]) => ({ authorId, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, args.limit ?? 10);

		return topSolvers;
	},
});

export const deleteMessage = mutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteMessageInternalLogic(ctx, args.id);
		return null;
	},
});

export const deleteManyMessages = mutation({
	args: {
		ids: v.array(v.string()),
	},
	handler: async (ctx, args) => {
		for (const id of args.ids) {
			await deleteMessageInternalLogic(ctx, id);
		}
		return null;
	},
});

export const deleteManyMessagesByChannelId = mutation({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_channelId", (q) => q.eq("channelId", args.channelId))
			.collect();

		for (const message of messages) {
			await deleteMessageInternalLogic(ctx, message.id);
		}

		return null;
	},
});

export const deleteManyMessagesByUserId = mutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await ctx.db
			.query("messages")
			.withIndex("by_authorId", (q) => q.eq("authorId", args.userId))
			.collect();

		for (const message of messages) {
			await deleteMessageInternalLogic(ctx, message.id);
		}

		return null;
	},
});

export const deleteMessageInternal = internalMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteMessageInternalLogic(ctx, args.id);
		return null;
	},
});

// Helper to get thread ID from a message
function getThreadIdOfMessage(message: {
	childThreadId?: string;
	parentChannelId?: string;
	channelId: string;
}): string | null {
	if (message.childThreadId) {
		return message.childThreadId;
	}
	if (message.parentChannelId) {
		return message.channelId;
	}
	return null;
}

// Helper to get parent channel ID
function getParentChannelOfMessage(message: {
	parentChannelId?: string;
	channelId: string;
}): string {
	return message.parentChannelId ?? message.channelId;
}

/**
 * Get all data needed for displaying a message page
 * Returns messages, server, channel, thread, and related data
 */
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
		if (args.channelId) {
			searchQuery = searchQuery.filter((q) =>
				q.eq(q.field("channelId"), args.channelId),
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
				const channel = await getChannelWithSettings(ctx, message.channelId);
				if (channel?.flags.indexingEnabled) {
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
