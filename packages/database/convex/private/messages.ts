import { v } from "convex/values";
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
	deleteMessageInternalLogic,
	findIgnoredDiscordAccountById,
	findUserServerSettingsById,
	getChannelWithSettings,
	getMessageById as getMessageByIdShared,
	upsertMessageInternalLogic,
} from "../shared/shared";

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
		const messageData = { ...args.message };

		if (messageData.id === messageData.channelId) {
			messageData.childThreadId = messageData.channelId;
		}

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

export const getTopQuestionSolversByServerId = privateQuery({
	args: {
		serverId: v.int64(),
		limit: v.optional(v.number()),
	},
	handler: async (ctx, args) => {
		const solutions = await ctx.db
			.query("messages")
			.withIndex("by_serverId_and_questionId", (q) =>
				q.eq("serverId", args.serverId).gt("questionId", 0n),
			)
			.collect();

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

export const updateEmbedStorageId = privateMutation({
	args: {
		messageId: v.int64(),
		embedIndex: v.number(),
		field: v.union(
			v.literal("image"),
			v.literal("thumbnail"),
			v.literal("video"),
			v.literal("footerIcon"),
			v.literal("authorIcon"),
		),
		storageId: v.id("_storage"),
	},
	handler: async (ctx, args) => {
		const message = await getOneFrom(
			ctx.db,
			"messages",
			"by_messageId",
			args.messageId,
			"id",
		);
		if (!message) {
			throw new Error("Message not found");
		}

		const embeds = message.embeds ?? [];
		if (args.embedIndex < 0 || args.embedIndex >= embeds.length) {
			throw new Error("Invalid embed index");
		}

		const embed = embeds[args.embedIndex];
		if (!embed) {
			throw new Error("Embed not found at index");
		}

		const updatedEmbed = { ...embed };

		if (args.field === "image" && updatedEmbed.image) {
			updatedEmbed.image = {
				...updatedEmbed.image,
				storageId: args.storageId,
			};
		} else if (args.field === "thumbnail" && updatedEmbed.thumbnail) {
			updatedEmbed.thumbnail = {
				...updatedEmbed.thumbnail,
				storageId: args.storageId,
			};
		} else if (args.field === "video" && updatedEmbed.video) {
			updatedEmbed.video = {
				...updatedEmbed.video,
				storageId: args.storageId,
			};
		} else if (args.field === "footerIcon" && updatedEmbed.footer) {
			updatedEmbed.footer = {
				...updatedEmbed.footer,
				iconStorageId: args.storageId,
			};
		} else if (args.field === "authorIcon" && updatedEmbed.author) {
			updatedEmbed.author = {
				...updatedEmbed.author,
				iconStorageId: args.storageId,
			};
		} else {
			throw new Error(
				`Invalid field ${args.field} or field not present in embed`,
			);
		}

		const updatedEmbeds = [...embeds];
		updatedEmbeds[args.embedIndex] = updatedEmbed;

		await ctx.db.patch(message._id, { embeds: updatedEmbeds });
		return null;
	},
});

export const updateEmbedS3Key = privateMutation({
	args: {
		messageId: v.int64(),
		embedIndex: v.number(),
		field: v.union(
			v.literal("image"),
			v.literal("thumbnail"),
			v.literal("video"),
			v.literal("footerIcon"),
			v.literal("authorIcon"),
		),
		s3Key: v.string(),
	},
	handler: async (ctx, args) => {
		const message = await getOneFrom(
			ctx.db,
			"messages",
			"by_messageId",
			args.messageId,
			"id",
		);
		if (!message) {
			throw new Error("Message not found");
		}

		const embeds = message.embeds ?? [];
		if (args.embedIndex < 0 || args.embedIndex >= embeds.length) {
			throw new Error("Invalid embed index");
		}

		const embed = embeds[args.embedIndex];
		if (!embed) {
			throw new Error("Embed not found at index");
		}

		const updatedEmbed = { ...embed };

		if (args.field === "image" && updatedEmbed.image) {
			updatedEmbed.image = {
				...updatedEmbed.image,
				s3Key: args.s3Key,
			};
		} else if (args.field === "thumbnail" && updatedEmbed.thumbnail) {
			updatedEmbed.thumbnail = {
				...updatedEmbed.thumbnail,
				s3Key: args.s3Key,
			};
		} else if (args.field === "video" && updatedEmbed.video) {
			updatedEmbed.video = {
				...updatedEmbed.video,
				s3Key: args.s3Key,
			};
		} else if (args.field === "footerIcon" && updatedEmbed.footer) {
			updatedEmbed.footer = {
				...updatedEmbed.footer,
				iconS3Key: args.s3Key,
			};
		} else if (args.field === "authorIcon" && updatedEmbed.author) {
			updatedEmbed.author = {
				...updatedEmbed.author,
				iconS3Key: args.s3Key,
			};
		} else {
			throw new Error(
				`Invalid field ${args.field} or field not present in embed`,
			);
		}

		const updatedEmbeds = [...embeds];
		updatedEmbeds[args.embedIndex] = updatedEmbed;

		await ctx.db.patch(message._id, { embeds: updatedEmbeds });
		return null;
	},
});

export const markMessageAsSolution = privateMutation({
	args: {
		solutionMessageId: v.int64(),
		questionMessageId: v.int64(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const solutionMessage = await getOneFrom(
			ctx.db,
			"messages",
			"by_messageId",
			args.solutionMessageId,
			"id",
		);
		if (!solutionMessage) {
			throw new Error("Solution message not found");
		}
		await ctx.db.patch(solutionMessage._id, {
			questionId: args.questionMessageId,
		});
		return null;
	},
});

export const getMessagePageHeaderData = privateQuery({
	args: {
		messageId: v.int64(),
	},
	handler: async (ctx, args) => {
		const targetMessage = await getMessageByIdShared(ctx, args.messageId);

		const thread = await getOneFrom(
			ctx.db,
			"channels",
			"by_discordChannelId",
			targetMessage?.parentChannelId ? targetMessage.channelId : args.messageId,
			"id",
		);

		const channelId =
			thread?.parentId ??
			targetMessage?.parentChannelId ??
			targetMessage?.channelId;
		if (!channelId) {
			return null;
		}

		const channel = await getChannelWithSettings(ctx, channelId);
		if (!channel?.flags?.indexingEnabled) {
			console.error("Channel indexing not enabled", channel?.id);
			return null;
		}

		const firstMessage = targetMessage;

		const [enrichedFirstMessage, server] = await Promise.all([
			firstMessage ? enrichMessages(ctx, [firstMessage]) : [],
			getOneFrom(
				ctx.db,
				"servers",
				"by_discordId",
				channel.serverId,
				"discordId",
			),
		]);

		if (!server) {
			console.error("Server not found", channel.serverId);
			return null;
		}

		const enrichedFirst = enrichedFirstMessage[0] ?? null;
		const solutionMessageId = enrichedFirst?.solutions?.at(0)?.id;

		const [solutionMessage, serverPreferences] = await Promise.all([
			solutionMessageId
				? getMessageByIdShared(ctx, solutionMessageId).then((msg) =>
						msg ? enrichMessages(ctx, [msg]) : [],
					)
				: Promise.resolve([]),
			getOneFrom(ctx.db, "serverPreferences", "by_serverId", server.discordId),
		]);

		return {
			canonicalId: thread?.id ?? targetMessage?.id ?? args.messageId,
			firstMessage: enrichedFirst,
			solutionMessage: solutionMessage[0] ?? null,
			channelId,
			threadId: thread?.id ?? null,
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
				inviteCode: channel.flags.inviteCode,
			},
			thread,
		};
	},
});
