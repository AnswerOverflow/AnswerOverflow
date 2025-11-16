import { type Infer, v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import type { Id } from "../_generated/dataModel";
import {
	type MutationCtx,
	privateMutation,
	privateQuery,
	type QueryCtx,
} from "../client";
import { attachmentSchema, emojiSchema, messageSchema } from "../schema";
import {
	deleteMessageInternalLogic,
	extractDiscordLinks,
	extractMentionIds,
	findAttachmentsByMessageId as findAttachmentsByMessageIdShared,
	findIgnoredDiscordAccountById,
	findMessagesByAuthorId as findMessagesByAuthorIdShared,
	findMessagesByChannelId as findMessagesByChannelIdShared,
	findReactionsByMessageId as findReactionsByMessageIdShared,
	findSolutionsByQuestionId as findSolutionsByQuestionIdShared,
	findUserServerSettingsById,
	getChannelWithSettings,
	getDiscordAccountById,
	getInternalLinksMetadata,
	getMentionMetadata,
	getMessageById as getMessageByIdShared,
	upsertMessageInternalLogic,
} from "../shared/shared";

type Message = Infer<typeof messageSchema>;

type DiscordLinkReference = ReturnType<typeof extractDiscordLinks>[number];
type MentionMetadataResult = Awaited<ReturnType<typeof getMentionMetadata>>;
type InternalLinkMetadata = Awaited<
	ReturnType<typeof getInternalLinksMetadata>
>;
type AuthorRecord = NonNullable<
	Awaited<ReturnType<typeof getDiscordAccountById>>
>;
type SolutionsResult = Awaited<
	ReturnType<typeof findSolutionsByQuestionIdShared>
>;

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
	serverId: Id<"servers">,
): Promise<boolean> {
	const settings = await findUserServerSettingsById(ctx, authorId, serverId);
	return settings?.messageIndexingDisabled === true;
}

function collectMessageReferenceTargets(messages: Array<Message>): {
	userIds: string[];
	channelIds: string[];
	discordLinks: Array<DiscordLinkReference>;
} {
	const userIds = new Set<string>();
	const channelIds = new Set<string>();
	const discordLinks: Array<DiscordLinkReference> = [];

	for (const message of messages) {
		const mentionIds = extractMentionIds(message.content);
		for (const userId of mentionIds.userIds) {
			userIds.add(userId);
		}
		for (const channelId of mentionIds.channelIds) {
			channelIds.add(channelId);
		}
		discordLinks.push(...extractDiscordLinks(message.content));
	}

	return {
		userIds: Array.from(userIds),
		channelIds: Array.from(channelIds),
		discordLinks,
	};
}

async function buildAuthorMap(
	ctx: QueryCtx | MutationCtx,
	messages: Array<Message>,
): Promise<Map<string, AuthorRecord>> {
	const uniqueAuthorIds = Array.from(
		new Set(messages.map((message) => message.authorId)),
	);

	const authors = await asyncMap(uniqueAuthorIds, (id) =>
		getDiscordAccountById(ctx, id),
	);

	return new Map(
		authors
			.filter((author): author is AuthorRecord => author !== null)
			.map((author) => [author.id, author]),
	);
}

function createInternalLinkLookup(
	internalLinks: InternalLinkMetadata,
): Map<string, InternalLinkMetadata[number]> {
	const lookup = new Map<string, InternalLinkMetadata[number]>();

	for (const link of internalLinks) {
		if (!lookup.has(link.original)) {
			lookup.set(link.original, link);
		}
	}

	return lookup;
}

function buildMessageMetadataRecord(
	mentionMetadata: MentionMetadataResult,
	serverDiscordId: string,
	mentionIds: ReturnType<typeof extractMentionIds>,
	internalLinkLookup: Map<string, InternalLinkMetadata[number]>,
	messageDiscordLinks: Array<DiscordLinkReference>,
) {
	const users: MentionMetadataResult["users"] = {};
	for (const userId of mentionIds.userIds) {
		const user = mentionMetadata.users[userId];
		if (user) {
			users[userId] = user;
		}
	}

	const channels: MentionMetadataResult["channels"] = {};
	for (const channelId of mentionIds.channelIds) {
		const channelMeta = mentionMetadata.channels[channelId];
		if (channelMeta) {
			channels[channelId] = channelMeta;
		} else {
			channels[channelId] = {
				name: "Unknown Channel",
				type: 0,
				url: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
				indexingEnabled: false,
				exists: false,
			};
		}
	}

	const internalLinks: Array<InternalLinkMetadata[number]> = [];
	for (const link of messageDiscordLinks) {
		const metadata = internalLinkLookup.get(link.original);
		if (metadata) {
			internalLinks.push(metadata);
		}
	}

	return {
		users: Object.keys(users).length === 0 ? undefined : users,
		channels: Object.keys(channels).length === 0 ? undefined : channels,
		internalLinks: internalLinks.length === 0 ? undefined : internalLinks,
	};
}

async function getSolutionsForMessage(
	ctx: QueryCtx | MutationCtx,
	message: Message,
) {
	if (!message.questionId) {
		const empty: SolutionsResult = [];
		return empty;
	}

	return await findSolutionsByQuestionIdShared(ctx, message.questionId);
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

	return messages.filter((message) => message.id >= targetMessageId);
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

		messages.sort((a, b) => {
			return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
		});

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

		allMessages.sort((a, b) => {
			return a.id > b.id ? -1 : a.id < b.id ? 1 : 0;
		});

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
		serverId: v.id("servers"),
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

		const server = await ctx.db.get(targetMessage.serverId);
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

		const authorMap = await buildAuthorMap(ctx, messagesToShow);

		const referenceTargets = collectMessageReferenceTargets(messagesToShow);

		const [mentionMetadata, internalLinks] = await Promise.all([
			getMentionMetadata(
				ctx,
				referenceTargets.userIds,
				referenceTargets.channelIds,
				server.discordId,
			),
			getInternalLinksMetadata(ctx, referenceTargets.discordLinks),
		]);

		const internalLinkLookup = createInternalLinkLookup(internalLinks);

		const messagesWithData = await asyncMap(messagesToShow, async (message) => {
			const mentionIds = extractMentionIds(message.content);
			const messageDiscordLinks = extractDiscordLinks(message.content);
			const metadata = buildMessageMetadataRecord(
				mentionMetadata,
				server.discordId,
				mentionIds,
				internalLinkLookup,
				messageDiscordLinks,
			);

			const [attachments, reactions, solutions] = await Promise.all([
				findAttachmentsByMessageIdShared(ctx, message.id),
				findReactionsByMessageIdShared(ctx, message.id),
				getSolutionsForMessage(ctx, message),
			]);

			const author = authorMap.get(message.authorId) ?? null;

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
				metadata,
			};
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
