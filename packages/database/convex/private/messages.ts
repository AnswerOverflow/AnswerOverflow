import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";

import {
	type MutationCtx,
	privateMutation,
	privateQuery,
	type QueryCtx,
} from "../client";
import { attachmentSchema, emojiSchema, messageSchema } from "../schema";
import {
	compareIds,
	deleteMessageInternalLogic,
	enrichMessageForDisplay,
	findAttachmentsByMessageId as findAttachmentsByMessageIdShared,
	findIgnoredDiscordAccountById,
	findMessagesByAuthorId as findMessagesByAuthorIdShared,
	findMessagesByChannelId as findMessagesByChannelIdShared,
	findReactionsByMessageId as findReactionsByMessageIdShared,
	findSolutionsByQuestionId as findSolutionsByQuestionIdShared,
	findUserServerSettingsById,
	getChannelWithSettings,
	getMessageById as getMessageByIdShared,
	getServerByDiscordId,
	upsertMessageInternalLogic,
} from "../shared/shared";

type Message = Infer<typeof messageSchema>;

async function isIgnoredAccount(
	ctx: QueryCtx | MutationCtx,
	authorId: string,
): Promise<boolean> {
	const ignoredAccount = await findIgnoredDiscordAccountById(ctx, authorId);
	return ignoredAccount !== null;
}

async function hasMessageIndexingDisabled(
	ctx: QueryCtx | MutationCtx,
	authorId: string,
	serverId: string,
): Promise<boolean> {
	const settings = await findUserServerSettingsById(ctx, authorId, serverId);
	return settings?.messageIndexingDisabled === true;
}

async function loadThreadSummary(
	ctx: QueryCtx | MutationCtx,
	threadId: string | null,
	channelId: string,
	channelType: number,
) {
	if (!threadId || threadId === channelId) {
		return null;
	}

	const threadChannel = await getChannelWithSettings(ctx, threadId);
	if (!threadChannel) {
		return null;
	}

	return {
		id: threadChannel.id,
		name: threadChannel.name,
		type: channelType,
	};
}

function selectMessagesForDisplay(
	messages: Array<Message>,
	threadId: string | null,
	targetMessageId: string,
) {
	if (threadId) {
		return messages;
	}

	return messages.filter(
		(message) => compareIds(message.id, targetMessageId) >= 0,
	);
}

export const upsertMessage = privateMutation({
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

		if (attachments !== undefined) {
			const existingAttachments = await getManyFrom(
				ctx.db,
				"attachments",
				"by_messageId",
				messageData.id,
			);

			for (const attachment of existingAttachments) {
				await ctx.db.delete(attachment._id);
			}

			if (attachments.length > 0) {
				for (const attachment of attachments) {
					await ctx.db.insert("attachments", attachment);
				}
			}
		}

		if (reactions !== undefined) {
			const existingReactions = await getManyFrom(
				ctx.db,
				"reactions",
				"by_messageId",
				messageData.id,
			);

			for (const reaction of existingReactions) {
				await ctx.db.delete(reaction._id);
			}

			if (reactions.length > 0) {
				const emojiSet = new Set<string>();
				for (const reaction of reactions) {
					emojiSet.add(reaction.emoji.id);
				}

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

export const upsertManyMessages = privateMutation({
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

		if (!args.ignoreChecks) {
			const authorIds = new Set(args.messages.map((m) => m.message.authorId));
			const ignoredAccounts = await asyncMap(Array.from(authorIds), (id) =>
				isIgnoredAccount(ctx, id),
			);

			const ignoredAccountIds = new Set(
				Array.from(authorIds).filter((_, idx) => ignoredAccounts[idx]),
			);

			const messagesToProcess = args.messages.filter(
				(msg) => !ignoredAccountIds.has(msg.message.authorId),
			);

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

			for (const msgData of messagesToUpsert) {
				await upsertMessageInternalLogic(ctx, {
					message: msgData.message,
					attachments: msgData.attachments,
					reactions: msgData.reactions,
				});
			}
		} else {
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

export const getMessageById = privateQuery({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		return await getMessageByIdShared(ctx, args.id);
	},
});

export const findMessagesByChannelId = privateQuery({
	args: {
		channelId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await findMessagesByChannelIdShared(ctx, args.channelId, args.limit);
	},
});

export const findManyMessagesById = privateQuery({
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

export const findMessagesByAuthorId = privateQuery({
	args: {
		authorId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		return await findMessagesByAuthorIdShared(ctx, args.authorId, args.limit);
	},
});

export const findMessagesByServerId = privateQuery({
	args: {
		serverId: v.string(),
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

export const findMessagesByParentChannelId = privateQuery({
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

export const findLatestMessageInChannel = privateQuery({
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

		messages.sort((a, b) => compareIds(b.id, a.id));

		return messages[0] ?? null;
	},
});

export const findLatestMessageInChannelAndThreads = privateQuery({
	args: {
		channelId: v.string(),
	},
	handler: async (ctx, args) => {
		const channelMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_channelId",
			args.channelId,
		);

		const threadMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_parentChannelId",
			args.channelId,
		);

		const allMessages = [...channelMessages, ...threadMessages];
		if (allMessages.length === 0) return null;

		allMessages.sort((a, b) => compareIds(b.id, a.id));

		return allMessages[0] ?? null;
	},
});

export const findAttachmentsByMessageId = privateQuery({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		return await findAttachmentsByMessageIdShared(ctx, args.messageId);
	},
});

export const findReactionsByMessageId = privateQuery({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		return await findReactionsByMessageIdShared(ctx, args.messageId);
	},
});

export const findEmojiById = privateQuery({
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

export const countMessagesInChannel = privateQuery({
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

export const countMessagesInManyChannels = privateQuery({
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

export const getTotalMessageCount = privateQuery({
	args: {},
	handler: async (ctx) => {
		const messages = await ctx.db.query("messages").collect();
		return messages.length;
	},
});

export const findSolutionsByQuestionId = privateQuery({
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

export const getTopQuestionSolversByServerId = privateQuery({
	args: {
		serverId: v.string(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const allMessages = await getManyFrom(
			ctx.db,
			"messages",
			"by_serverId",
			args.serverId,
		);

		const solutions = allMessages.filter((msg) => msg.questionId !== undefined);

		const solutionCounts = new Map<string, number>();
		for (const solution of solutions) {
			const current = solutionCounts.get(solution.authorId) ?? 0;
			solutionCounts.set(solution.authorId, current + 1);
		}

		const topSolvers = Array.from(solutionCounts.entries())
			.map(([authorId, count]) => ({ authorId, count }))
			.sort((a, b) => b.count - a.count)
			.slice(0, args.limit ?? 10);

		return topSolvers;
	},
});

export const deleteMessage = privateMutation({
	args: {
		id: v.string(),
	},
	handler: async (ctx, args) => {
		await deleteMessageInternalLogic(ctx, args.id);
		return null;
	},
});

export const deleteManyMessages = privateMutation({
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

export const deleteManyMessagesByChannelId = privateMutation({
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

export const deleteManyMessagesByUserId = privateMutation({
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

export const getMessagePageData = privateQuery({
	args: {
		messageId: v.string(),
	},
	handler: async (ctx, args) => {
		const targetMessage = await getMessageByIdShared(ctx, args.messageId);

		if (!targetMessage) {
			return null;
		}

		const server = await getServerByDiscordId(ctx, targetMessage.serverId);
		if (!server) {
			return null;
		}

		const threadId = getThreadIdOfMessage(targetMessage);
		const parentId = getParentChannelOfMessage(targetMessage);
		const channelId = threadId ?? parentId;
		const channel = await getChannelWithSettings(ctx, channelId);

		if (!channel) {
			return null;
		}

		const thread = await loadThreadSummary(
			ctx,
			threadId,
			channelId,
			channel.type,
		);

		const allMessages = await findMessagesByChannelIdShared(
			ctx,
			channelId,
			threadId ? undefined : 50,
		);

		const messagesToShow = selectMessagesForDisplay(
			allMessages,
			threadId,
			targetMessage.id,
		);

		const messagesWithData = await asyncMap(messagesToShow, async (message) => {
			return await enrichMessageForDisplay(ctx, message);
		});

		return {
			messages: messagesWithData,
			server: {
				_id: server._id,
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
