import { v } from "convex/values";
import { asyncMap } from "convex-helpers";
import { getOneFrom } from "convex-helpers/server/relationships";
import {
	type MutationCtx,
	privateMutation,
	privateQuery,
	type QueryCtx,
} from "../client";
import { attachmentSchema, emojiSchema, messageSchema } from "../schema";
import { enrichMessage, enrichMessages } from "../shared/dataAccess";
import { getThreadStartMessage } from "../shared/messages";
import {
	type BulkMessageInput,
	deleteMessageInternalLogic,
	findIgnoredDiscordAccountById,
	findUserServerSettingsById,
	getMessageById as getMessageByIdShared,
	upsertManyMessagesOptimized,
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

		await upsertMessageInternalLogic(ctx, {
			message: args.message,
			attachments: args.attachments,
			reactions: args.reactions,
		});

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
		const created: bigint[] = [];
		const ignored: bigint[] = [];

		if (args.messages.length === 0) {
			return { created, ignored };
		}

		let messagesToUpsert: BulkMessageInput[];

		if (!args.ignoreChecks) {
			const authorIds = new Set(args.messages.map((m) => m.message.authorId));
			const ignoredAccounts = await asyncMap(Array.from(authorIds), (id) =>
				isIgnoredAccount(ctx, id),
			);

			const ignoredAccountIds = new Set(
				Array.from(authorIds).filter((_, idx) => ignoredAccounts[idx]),
			);

			const ignoredByAccount = args.messages.filter((msg) =>
				ignoredAccountIds.has(msg.message.authorId),
			);
			for (const msg of ignoredByAccount) {
				ignored.push(msg.message.id);
			}

			const messagesToProcess = args.messages.filter(
				(msg) => !ignoredAccountIds.has(msg.message.authorId),
			);

			messagesToUpsert = [];
			for (const msg of messagesToProcess) {
				const indexingDisabled = await hasMessageIndexingDisabled(
					ctx,
					msg.message.authorId,
					msg.message.serverId,
				);
				if (indexingDisabled) {
					ignored.push(msg.message.id);
				} else {
					messagesToUpsert.push(msg);
				}
			}
		} else {
			messagesToUpsert = args.messages;
		}

		await upsertManyMessagesOptimized(ctx, messagesToUpsert);

		for (const msg of messagesToUpsert) {
			created.push(msg.message.id);
		}

		return { created, ignored };
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
			console.warn(
				"Message not found during updateEmbedStorageId",
				args.messageId,
			);
			return null;
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
			console.warn("Message not found during updateEmbedS3Key", args.messageId);
			return null;
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
			console.warn(
				"Solution message not found during markMessageAsSolution",
				args.solutionMessageId,
			);
			return null;
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

		const [enrichedFirst, solutionMessages] = await Promise.all([
			rootMessage ? enrichMessage(ctx, rootMessage) : null,
			rootMessage
				? ctx.cache.getSolutionsByQuestionId(rootMessage.id)
				: Promise.resolve([]),
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
