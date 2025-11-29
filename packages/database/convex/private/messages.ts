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
import { enrichMessages } from "../shared/dataAccess";
import {
	compareIds,
	deleteMessageInternalLogic,
	findIgnoredDiscordAccountById,
	findMessagesByChannelId,
	findUserServerSettingsById,
	getChannelWithSettings,
	getMessageById as getMessageByIdShared,
	upsertMessageInternalLogic,
} from "../shared/shared";

type Message = Infer<typeof messageSchema>;

async function isIgnoredAccount(
	ctx: QueryCtx | MutationCtx,
	authorId: bigint,
): Promise<boolean> {
	const ignoredAccount = await findIgnoredDiscordAccountById(ctx, authorId);
	return ignoredAccount !== null;
}

async function hasMessageIndexingDisabled(
	ctx: QueryCtx | MutationCtx,
	authorId: bigint,
	serverId: bigint,
): Promise<boolean> {
	const settings = await findUserServerSettingsById(ctx, authorId, serverId);
	return settings?.messageIndexingDisabled === true;
}

function selectMessagesForDisplay(
	messages: Array<Message>,
	threadId: bigint | null,
	targetMessageId: bigint,
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
					userId: v.int64(),
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
				const emojiSet = new Set<bigint>();
				for (const reaction of reactions) {
					emojiSet.add(reaction.emoji.id);
				}

				for (const reaction of reactions) {
					const emojiId = reaction.emoji.id;
					if (!emojiId) continue;

					const existingEmoji = await getOneFrom(
						ctx.db,
						"emojis",
						"by_emojiId",
						emojiId,
						"id",
					);

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
							userId: v.int64(),
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
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		return await getMessageByIdShared(ctx, args.id);
	},
});

export const getTotalMessageCount = privateQuery({
	args: {},
	handler: async (ctx) => {
		const messages = await ctx.db.query("messages").collect();
		return messages.length;
	},
});

// TODO: Probably use analytics from PostHog for this instead
export const getTopQuestionSolversByServerId = privateQuery({
	args: {
		serverId: v.int64(),
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

		const solutionCounts = new Map<bigint, number>();
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
		id: v.int64(),
	},
	handler: async (ctx, args) => {
		await deleteMessageInternalLogic(ctx, args.id);
		return null;
	},
});

export const deleteManyMessages = privateMutation({
	args: {
		ids: v.array(v.int64()),
	},
	handler: async (ctx, args) => {
		for (const id of args.ids) {
			await deleteMessageInternalLogic(ctx, id);
		}
		return null;
	},
});

function getThreadIdOfMessage(
	message: Pick<Message, "channelId"> &
		Partial<Pick<Message, "childThreadId" | "parentChannelId">>,
): bigint | null {
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
): bigint {
	return message.parentChannelId ?? message.channelId;
}

export const getMessagePageData = privateQuery({
	args: {
		messageId: v.int64(),
	},
	handler: async (ctx, args) => {
		const targetMessage = await getMessageByIdShared(ctx, args.messageId);

		if (!targetMessage) {
			return null;
		}

		const threadId = getThreadIdOfMessage(targetMessage);
		const parentId = getParentChannelOfMessage(targetMessage);
		const channelId = threadId ?? parentId;
		const channel = await getChannelWithSettings(ctx, channelId);

		if (!channel) {
			return null;
		}

		const thread = threadId
			? await getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					threadId,
					"id",
				)
			: null;

		let allMessages = await findMessagesByChannelId(
			ctx,
			channelId,
			threadId ? undefined : 50,
		);

		if (threadId) {
			const threadStarterMessages = await ctx.db
				.query("messages")
				.withIndex("by_childThreadId", (q) => q.eq("childThreadId", threadId))
				.collect();

			const existingIds = new Set(allMessages.map((m) => m.id));
			const newMessages = threadStarterMessages.filter(
				(m) => !existingIds.has(m.id),
			);
			allMessages = [...allMessages, ...newMessages].sort((a, b) =>
				compareIds(a.id, b.id),
			);
		}

		const messagesToShow = selectMessagesForDisplay(
			allMessages,
			threadId,
			targetMessage.id,
		);

		const [enrichedMessages, server] = await Promise.all([
			enrichMessages(ctx, messagesToShow),
			getOneFrom(
				ctx.db,
				"servers",
				"by_discordId",
				targetMessage.serverId,
				"discordId",
			),
		]);

		if (enrichedMessages.length === 0 || !server) {
			return null;
		}

		const serverPreferences = server.preferencesId
			? await ctx.db.get(server.preferencesId)
			: null;

		return {
			messages: enrichedMessages,
			server: {
				_id: server._id,
				discordId: server.discordId,
				name: server.name,
				icon: server.icon,
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
				inviteCode: channel.inviteCode,
			},
			thread,
		};
	},
});
