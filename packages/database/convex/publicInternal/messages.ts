import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import type { Id } from "../_generated/dataModel";
import {
	type MutationCtx,
	publicInternalMutation,
	publicInternalQuery,
	type QueryCtx,
} from "../client";
import { attachmentSchema, emojiSchema, messageSchema } from "../schema";
import {
	deleteMessageInternalLogic,
	findAttachmentsByMessageId as findAttachmentsByMessageIdShared,
	findIgnoredDiscordAccountById,
	findMessagesByAuthorId as findMessagesByAuthorIdShared,
	findMessagesByChannelId as findMessagesByChannelIdShared,
	findReactionsByMessageId as findReactionsByMessageIdShared,
	findSolutionsByQuestionId as findSolutionsByQuestionIdShared,
	findUserServerSettingsById,
	getChannelWithSettings,
	getDiscordAccountById,
	getMessageById as getMessageByIdShared,
	upsertMessageInternalLogic,
} from "../shared/shared";

type Message = Infer<typeof messageSchema>;

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

export const upsertMessage = publicInternalMutation({
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

		// Upsert message - use index for efficient lookup
		const existing = await getOneFrom(
			ctx.db,
			"messages",
			"by_messageId",
			messageData.id,
			"id",
		);

		if (existing) {
			await ctx.db.replace(existing._id, messageData);
		} else {
			await ctx.db.insert("messages", messageData);
		}

		// Handle attachments
		if (attachments !== undefined) {
			// Delete existing attachments
			const existingAttachments = await getManyFrom(
				ctx.db,
				"attachments",
				"by_messageId",
				messageData.id,
			);

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
			const existingReactions = await getManyFrom(
				ctx.db,
				"reactions",
				"by_messageId",
				messageData.id,
			);

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

export const upsertManyMessages = publicInternalMutation({
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
			const ignoredAccounts = await asyncMap(Array.from(authorIds), (id) =>
				isIgnoredAccount(ctx, id),
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

export const getMessageById = publicInternalQuery({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await getMessageByIdShared(ctx, args.id);
	},
});

export const findMessagesByChannelId = publicInternalQuery({
	args: {
		channelId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await findMessagesByChannelIdShared(ctx, args.channelId, args.limit);
	},
});

export const findManyMessagesById = publicInternalQuery({
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

export const findMessagesByAuthorId = publicInternalQuery({
	args: {
		authorId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await findMessagesByAuthorIdShared(ctx, args.authorId, args.limit);
	},
});

export const findMessagesByServerId = publicInternalQuery({
	args: {
		serverId: v.id("servers"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_serverId",
			args.serverId,
		);

		return messages.slice(0, args.limit ?? 100);
	},
});

export const findMessagesByParentChannelId = publicInternalQuery({
	args: {
		parentChannelId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_parentChannelId",
			args.parentChannelId,
		);

		return messages.slice(0, args.limit ?? 100);
	},
});

export const findLatestMessageInChannel = publicInternalQuery({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_channelId",
			args.channelId,
		);

		if (messages.length === 0) return null;

		// Sort by ID (which is a snowflake, so higher = newer)
		messages.sort((a, b) => {
			return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
		});

		return messages[0] ?? null;
	},
});

export const findLatestMessageInChannelAndThreads = publicInternalQuery({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		// Get messages in the channel
		const channelMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_channelId",
			args.channelId,
		);

		// Get messages in threads (where parentChannelId matches)
		const threadMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_parentChannelId",
			args.channelId,
		);

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

export const findAttachmentsByMessageId = publicInternalQuery({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		return await findAttachmentsByMessageIdShared(ctx, args.messageId);
	},
});

export const findReactionsByMessageId = publicInternalQuery({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		return await findReactionsByMessageIdShared(ctx, args.messageId);
	},
});

export const findEmojiById = publicInternalQuery({
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

export const countMessagesInChannel = publicInternalQuery({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_channelId",
			args.channelId,
		);

		return messages.length;
	},
});

export const countMessagesInManyChannels = publicInternalQuery({
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

export const getTotalMessageCount = publicInternalQuery({
	args: {},
	handler: async (ctx) => {
		const messages = await ctx.db.query("messages").collect();
		return messages.length;
	},
});

export const findSolutionsByQuestionId = publicInternalQuery({
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

export const getTopQuestionSolversByServerId = publicInternalQuery({
	args: {
		serverId: v.id("servers"),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		// Get all messages in the server
		const allMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_serverId",
			args.serverId,
		);

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

export const deleteMessage = publicInternalMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteMessageInternalLogic(ctx, args.id);
		return null;
	},
});

export const deleteManyMessages = publicInternalMutation({
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

export const deleteManyMessagesByChannelId = publicInternalMutation({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_channelId",
			args.channelId,
		);

		for (const message of messages) {
			await deleteMessageInternalLogic(ctx, message.id);
		}

		return null;
	},
});

export const deleteManyMessagesByUserId = publicInternalMutation({
	args: {
		userId: v.string(),
	},
	handler: async (ctx, args) => {
		const messages = await getManyFrom(
			ctx.db,
			"messages",
			"by_authorId",
			args.userId,
		);

		for (const message of messages) {
			await deleteMessageInternalLogic(ctx, message.id);
		}

		return null;
	},
});

// Helper functions for message thread/channel resolution
function getThreadIdOfMessage(
	message: Pick<Message, "channelId"> &
		Partial<Pick<Message, "childThreadId" | "parentChannelId">>,
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
	message: Pick<Message, "channelId"> &
		Partial<Pick<Message, "parentChannelId">>,
): string {
	return message.parentChannelId ?? message.channelId;
}

export const getMessagePageData = publicInternalQuery({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
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
		const authors = await asyncMap(Array.from(authorIds), (id) =>
			getDiscordAccountById(ctx, id),
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
