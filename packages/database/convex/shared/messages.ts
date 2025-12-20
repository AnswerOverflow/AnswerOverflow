import type { Infer } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../client";
import type { attachmentSchema, emojiSchema, messageSchema } from "../schema";
import { anonymizeDiscordAccount } from "./anonymization.js";
import type { QueryCtxWithCache } from "./dataAccess";

type Message = Infer<typeof messageSchema>;
type MessageDoc = Doc<"messages">;
type AttachmentDoc = Doc<"attachments"> & { url: string };
export type DatabaseAttachment = Infer<typeof attachmentSchema>;
type Emoji = Infer<typeof emojiSchema>;

export async function getMessageById(ctx: QueryCtx | MutationCtx, id: bigint) {
	return await getOneFrom(ctx.db, "messages", "by_messageId", id, "id");
}

export function compareIds(a: bigint, b: bigint): number {
	return a > b ? 1 : a < b ? -1 : 0;
}

export async function getThreadStartMessage(
	ctx: QueryCtxWithCache,
	threadId: bigint,
): Promise<MessageDoc | null> {
	const rootMessage = await ctx.cache.getMessage(threadId);
	if (rootMessage) {
		return rootMessage;
	}

	const thread = await ctx.cache.getChannel(threadId);
	if (!thread?.parentId) {
		return null;
	}

	const firstMessageInThread = await ctx.cache.getFirstMessageAfter({
		messageId: threadId,
		channelId: thread.id,
	});
	if (!firstMessageInThread) {
		return null;
	}

	if (firstMessageInThread.referenceId) {
		const referencedMessage = await ctx.cache.getMessage(
			firstMessageInThread.referenceId,
		);
		if (referencedMessage) {
			return referencedMessage;
		}
	}

	return firstMessageInThread;
}

export async function getFirstMessagesInChannels(
	ctx: QueryCtx | MutationCtx,
	channelIds: bigint[],
): Promise<Record<string, MessageDoc | null>> {
	const results: Record<string, MessageDoc | null> = {};
	for (const channelId of channelIds) {
		results[channelId.toString()] = null;
	}

	if (channelIds.length === 0) {
		return results;
	}

	const channelMessages = await Promise.all(
		channelIds.map(async (channelId) => {
			const firstMessage = await ctx.db
				.query("messages")
				.withIndex("by_channelId_and_id", (q) => q.eq("channelId", channelId))
				.order("asc")
				.first();
			return {
				channelId,
				firstMessage: firstMessage ?? null,
			};
		}),
	);

	for (const { channelId, firstMessage } of channelMessages) {
		results[channelId.toString()] = firstMessage;
	}

	return results;
}

export async function findReactionsByMessageId(
	ctx: QueryCtx | MutationCtx,
	messageId: bigint,
) {
	return await getManyFrom(
		ctx.db,
		"reactions",
		"by_messageId",
		messageId,
		"messageId",
	);
}

export async function findMessagesByAuthorId(
	ctx: QueryCtx | MutationCtx,
	authorId: bigint,
	limit?: number,
) {
	const messages = await getManyFrom(
		ctx.db,
		"messages",
		"by_authorId",
		authorId,
		"authorId",
	);
	return messages.slice(0, limit ?? 100);
}

export async function findSolutionsByQuestionId(
	ctx: QueryCtx | MutationCtx,
	questionId: bigint,
	limit?: number,
) {
	const messages = await getManyFrom(
		ctx.db,
		"messages",
		"by_questionId",
		questionId,
		"questionId",
	);
	return messages.slice(0, limit ?? 100);
}

export async function deleteMessageInternalLogic(
	ctx: MutationCtx,
	id: bigint,
): Promise<void> {
	const attachments = await getManyFrom(
		ctx.db,
		"attachments",
		"by_messageId",
		id,
		"messageId",
	);

	for (const attachment of attachments) {
		await ctx.db.delete(attachment._id);
	}

	const reactions = await getManyFrom(
		ctx.db,
		"reactions",
		"by_messageId",
		id,
		"messageId",
	);

	for (const reaction of reactions) {
		await ctx.db.delete(reaction._id);
	}

	const message = await getOneFrom(
		ctx.db,
		"messages",
		"by_messageId",
		id,
		"id",
	);

	if (message) {
		await ctx.db.delete(message._id);
	}
}

export async function upsertMessageInternalLogic(
	ctx: MutationCtx,
	args: {
		message: Message;
		attachments?: DatabaseAttachment[];
		reactions?: Array<{
			userId: bigint;
			emoji: Infer<typeof emojiSchema>;
		}>;
	},
): Promise<void> {
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
			"messageId",
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
			"messageId",
		);

		for (const reaction of existingReactions) {
			await ctx.db.delete(reaction._id);
		}

		const reactionsWithEmojiId = reactions.filter((r) => r.emoji.id);
		if (reactionsWithEmojiId.length > 0) {
			const emojiIds = new Set(
				reactionsWithEmojiId
					.map((r) => r.emoji.id)
					.filter((id): id is bigint => !!id),
			);

			for (const emojiId of emojiIds) {
				const existingEmoji = await getOneFrom(
					ctx.db,
					"emojis",
					"by_emojiId",
					emojiId,
					"id",
				);

				if (!existingEmoji) {
					const reaction = reactionsWithEmojiId.find(
						(r) => r.emoji.id === emojiId,
					);
					if (reaction) {
						await ctx.db.insert("emojis", reaction.emoji);
					}
				}
			}

			for (const reaction of reactionsWithEmojiId) {
				if (!reaction.emoji.id) continue;
				await ctx.db.insert("reactions", {
					messageId: messageData.id,
					userId: reaction.userId,
					emojiId: reaction.emoji.id,
				});
			}
		}
	}
}

export type BulkMessageInput = {
	message: Message;
	attachments?: DatabaseAttachment[];
	reactions?: Array<{
		userId: bigint;
		emoji: Emoji;
	}>;
};

function createBulkUpsertCache(ctx: MutationCtx) {
	const messageCache = new Map<string, Promise<Doc<"messages"> | null>>();
	const attachmentsCache = new Map<string, Promise<Doc<"attachments">[]>>();
	const reactionsCache = new Map<string, Promise<Doc<"reactions">[]>>();
	const emojiCache = new Map<string, Promise<Doc<"emojis"> | null>>();

	return {
		getMessage: (id: bigint) => {
			const key = id.toString();
			const existing = messageCache.get(key);
			if (existing) return existing;
			const promise = getOneFrom(ctx.db, "messages", "by_messageId", id, "id");
			messageCache.set(key, promise);
			return promise;
		},

		getAttachments: (messageId: bigint) => {
			const key = messageId.toString();
			const existing = attachmentsCache.get(key);
			if (existing) return existing;
			const promise = getManyFrom(
				ctx.db,
				"attachments",
				"by_messageId",
				messageId,
				"messageId",
			);
			attachmentsCache.set(key, promise);
			return promise;
		},

		getReactions: (messageId: bigint) => {
			const key = messageId.toString();
			const existing = reactionsCache.get(key);
			if (existing) return existing;
			const promise = getManyFrom(
				ctx.db,
				"reactions",
				"by_messageId",
				messageId,
				"messageId",
			);
			reactionsCache.set(key, promise);
			return promise;
		},

		getEmoji: (id: bigint) => {
			const key = id.toString();
			const existing = emojiCache.get(key);
			if (existing) return existing;
			const promise = getOneFrom(ctx.db, "emojis", "by_emojiId", id, "id");
			emojiCache.set(key, promise);
			return promise;
		},
	};
}

function computeAttachmentsDiff(
	existingAttachments: Doc<"attachments">[],
	newAttachments: DatabaseAttachment[] | undefined,
) {
	if (newAttachments === undefined) {
		return { toDelete: [], toInsert: [] };
	}

	const existingById = new Map(
		existingAttachments.map((a) => [a.id.toString(), a]),
	);
	const newById = new Map(newAttachments.map((a) => [a.id.toString(), a]));

	const toDelete: Doc<"attachments">["_id"][] = [];
	const toInsert: DatabaseAttachment[] = [];

	for (const existing of existingAttachments) {
		if (!newById.has(existing.id.toString())) {
			toDelete.push(existing._id);
		}
	}

	for (const newAtt of newAttachments) {
		if (!existingById.has(newAtt.id.toString())) {
			toInsert.push(newAtt);
		}
	}

	return { toDelete, toInsert };
}

function computeReactionsDiff(
	existingReactions: Doc<"reactions">[],
	newReactions: Array<{ userId: bigint; emoji: Emoji }> | undefined,
	messageId: bigint,
) {
	if (newReactions === undefined) {
		return { toDelete: [], toInsert: [] };
	}

	const reactionKey = (r: { userId: bigint; emojiId: bigint }) =>
		`${r.userId}:${r.emojiId}`;

	const existingByKey = new Map(
		existingReactions.map((r) => [reactionKey(r), r]),
	);

	const newReactionsWithEmojiId = newReactions.filter(
		(r): r is { userId: bigint; emoji: Emoji & { id: bigint } } =>
			r.emoji.id !== undefined,
	);
	const newByKey = new Map(
		newReactionsWithEmojiId.map((r) => [
			reactionKey({ userId: r.userId, emojiId: r.emoji.id }),
			r,
		]),
	);

	const toDelete: Doc<"reactions">["_id"][] = [];
	const toInsert: Array<{
		messageId: bigint;
		userId: bigint;
		emojiId: bigint;
	}> = [];

	for (const existing of existingReactions) {
		if (!newByKey.has(reactionKey(existing))) {
			toDelete.push(existing._id);
		}
	}

	for (const newReaction of newReactionsWithEmojiId) {
		const key = reactionKey({
			userId: newReaction.userId,
			emojiId: newReaction.emoji.id,
		});
		if (!existingByKey.has(key)) {
			toInsert.push({
				messageId,
				userId: newReaction.userId,
				emojiId: newReaction.emoji.id,
			});
		}
	}

	return { toDelete, toInsert };
}

async function processMessageInput(
	_ctx: MutationCtx,
	cache: ReturnType<typeof createBulkUpsertCache>,
	input: BulkMessageInput,
	seenEmojiIds: Set<string>,
) {
	const messageData = { ...input.message };
	if (messageData.id === messageData.channelId) {
		messageData.childThreadId = messageData.channelId;
	}

	const [existingMessage, existingAttachments, existingReactions] =
		await Promise.all([
			cache.getMessage(messageData.id),
			input.attachments !== undefined
				? cache.getAttachments(messageData.id)
				: Promise.resolve([]),
			input.reactions !== undefined
				? cache.getReactions(messageData.id)
				: Promise.resolve([]),
		]);

	const emojiIdsToCheck =
		input.reactions
			?.map((r) => r.emoji.id)
			.filter((id): id is bigint => id !== undefined) ?? [];

	const existingEmojis = await Promise.all(
		emojiIdsToCheck.map((id) => cache.getEmoji(id)),
	);

	const existingEmojiIds = new Set(
		existingEmojis.filter((e) => e !== null).map((e) => e.id.toString()),
	);

	const attachmentsDiff = computeAttachmentsDiff(
		existingAttachments,
		input.attachments,
	);
	const reactionsDiff = computeReactionsDiff(
		existingReactions,
		input.reactions,
		messageData.id,
	);

	return {
		messageToWrite: existingMessage
			? { type: "update" as const, id: existingMessage._id, data: messageData }
			: { type: "insert" as const, data: messageData },

		attachmentsToDelete: attachmentsDiff.toDelete,
		attachmentsToInsert: attachmentsDiff.toInsert,

		reactionsToDelete: reactionsDiff.toDelete,
		emojisToInsert: (input.reactions ?? [])
			.filter((r) => {
				if (!r.emoji.id) return false;
				const idStr = r.emoji.id.toString();
				if (existingEmojiIds.has(idStr) || seenEmojiIds.has(idStr))
					return false;
				seenEmojiIds.add(idStr);
				return true;
			})
			.map((r) => r.emoji),
		reactionsToInsert: reactionsDiff.toInsert,
	};
}

export async function upsertManyMessagesOptimized(
	ctx: MutationCtx,
	inputs: BulkMessageInput[],
): Promise<void> {
	if (inputs.length === 0) return;

	const cache = createBulkUpsertCache(ctx);
	const seenEmojiIds = new Set<string>();

	const processedInputs = await Promise.all(
		inputs.map((input) => processMessageInput(ctx, cache, input, seenEmojiIds)),
	);

	for (const processed of processedInputs) {
		for (const id of processed.attachmentsToDelete) {
			await ctx.db.delete(id);
		}
		for (const id of processed.reactionsToDelete) {
			await ctx.db.delete(id);
		}
	}

	for (const processed of processedInputs) {
		if (processed.messageToWrite.type === "insert") {
			await ctx.db.insert("messages", processed.messageToWrite.data);
		} else {
			await ctx.db.replace(
				processed.messageToWrite.id,
				processed.messageToWrite.data,
			);
		}
	}

	for (const processed of processedInputs) {
		for (const attachment of processed.attachmentsToInsert) {
			await ctx.db.insert("attachments", attachment);
		}
	}

	for (const processed of processedInputs) {
		for (const emoji of processed.emojisToInsert) {
			await ctx.db.insert("emojis", emoji);
		}
	}

	for (const processed of processedInputs) {
		for (const reaction of processed.reactionsToInsert) {
			await ctx.db.insert("reactions", reaction);
		}
	}
}

export type EnrichedMessageReference = {
	messageId: bigint;
	message: EnrichedMessage | null;
};

export type EnrichedMessage = {
	message: MessageDoc;
	author: {
		id: bigint;
		name: string;
		avatar?: string;
	} | null;
	attachments: AttachmentDoc[];
	reactions: Array<{
		userId: bigint;
		emoji: {
			id: bigint;
			name: string;
			animated?: boolean;
		};
	}>;
	solutions: MessageDoc[];
	reference?: EnrichedMessageReference | null;
	metadata?: {
		users?: Record<
			string,
			{
				username: string;
				globalName: string | null;
				url: string;
				exists?: boolean;
			}
		>;
		channels?: Record<
			string,
			{
				name: string;
				type: number;
				url: string;
				indexingEnabled?: boolean;
				exists?: boolean;
			}
		>;
		internalLinks?: Array<{
			original: string;
			guild: { id: bigint; name: string };
			channel: {
				parent?: { name?: string; type?: number; parentId?: bigint };
				id: bigint;
				type: number;
				name: string;
			};
			message?: bigint;
		}>;
	};
};

function extractMentionIdsInternal(content: string): {
	userIds: bigint[];
	channelIds: bigint[];
} {
	const userIds = new Set<bigint>();
	const channelIds = new Set<bigint>();

	const userMentionRegex = /<@(\d+)>/g;
	const channelMentionRegex = /<#(\d+)>/g;

	for (const match of content.matchAll(userMentionRegex)) {
		if (match[1]) {
			userIds.add(BigInt(match[1]));
		}
	}

	for (const match of content.matchAll(channelMentionRegex)) {
		if (match[1]) {
			channelIds.add(BigInt(match[1]));
		}
	}

	return {
		userIds: Array.from(userIds),
		channelIds: Array.from(channelIds),
	};
}

function extractDiscordLinksInternal(content: string): Array<{
	original: string;
	guildId: bigint;
	channelId: bigint;
	messageId?: bigint;
}> {
	const discordLinkRegex =
		/https:\/\/discord\.com\/channels\/(\d+)\/(\d+)(?:\/(\d+))?/g;

	const matches = content.matchAll(discordLinkRegex);
	return Arr.map(Array.from(matches), (match) => {
		const guildId = match[1];
		const channelId = match[2];
		const messageId = match[3];
		if (!guildId || !channelId) {
			return undefined;
		}
		return {
			original: match[0],
			guildId: BigInt(guildId),
			channelId: BigInt(channelId),
			messageId: messageId ? BigInt(messageId) : undefined,
		};
	}).filter(Predicate.isNotNullable);
}

async function getMentionMetadataInternal(
	ctx: QueryCtxWithCache,
	userIds: bigint[],
	channelIds: bigint[],
	serverDiscordId: bigint,
) {
	const users: Record<
		string,
		{
			username: string;
			globalName: string | null;
			url: string;
			exists?: boolean;
		}
	> = {};
	const channels: Record<
		string,
		{
			name: string;
			type: number;
			url: string;
			indexingEnabled?: boolean;
			exists?: boolean;
		}
	> = {};

	const userResults = await Promise.all(
		userIds.map((userId) => ctx.cache.getDiscordAccount(userId)),
	);

	for (let i = 0; i < userIds.length; i++) {
		const userId = userIds[i];
		const account = userResults[i];
		if (!userId) continue;
		const userIdStr = userId.toString();
		if (account) {
			users[userIdStr] = {
				username: account.name,
				globalName: null,
				url: `/u/${userId}`,
				exists: true,
			};
		} else {
			users[userIdStr] = {
				username: "Unknown user",
				globalName: null,
				url: "",
				exists: false,
			};
		}
	}

	const channelResults = await Promise.all(
		channelIds.map(async (channelId) => {
			const [channel, settings] = await Promise.all([
				ctx.cache.getChannel(channelId),
				ctx.cache.getChannelSettings(channelId),
			]);
			return { channelId, channel, settings };
		}),
	);

	for (const { channelId, channel, settings } of channelResults) {
		const channelIdStr = channelId.toString();
		if (channel) {
			const indexingEnabled = settings?.indexingEnabled ?? false;
			channels[channelIdStr] = {
				name: channel.name,
				type: channel.type,
				url: indexingEnabled
					? `/c/${serverDiscordId}/${channelId}`
					: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
				indexingEnabled,
				exists: true,
			};
		} else {
			channels[channelIdStr] = {
				name: "Unknown Channel",
				type: 0,
				url: `https://discord.com/channels/${serverDiscordId}/${channelId}`,
				indexingEnabled: false,
				exists: false,
			};
		}
	}

	return { users, channels };
}

async function getInternalLinksMetadataInternal(
	ctx: QueryCtxWithCache,
	discordLinks: Array<{
		original: string;
		guildId: bigint;
		channelId: bigint;
		messageId?: bigint;
	}>,
) {
	if (discordLinks.length === 0) {
		return [];
	}

	const results = await Promise.all(
		discordLinks.map(async (link) => {
			const [server, channel, settings] = await Promise.all([
				ctx.cache.getServer(link.guildId),
				ctx.cache.getChannel(link.channelId),
				ctx.cache.getChannelSettings(link.channelId),
			]);

			if (!server || !channel) {
				return undefined;
			}

			if (link.messageId) {
				const message = await ctx.cache.getMessage(link.messageId);
				if (!message) {
					return undefined;
				}
			}

			const parentChannel = channel.parentId
				? await ctx.cache.getChannel(channel.parentId)
				: undefined;

			return {
				original: link.original,
				guild: { id: server.discordId, name: server.name },
				channel: {
					id: channel.id,
					type: channel.type,
					name: channel.name,
					indexingEnabled: settings?.indexingEnabled ?? false,
					parent: parentChannel
						? {
								name: parentChannel.name,
								type: parentChannel.type,
								parentId: parentChannel.id,
							}
						: undefined,
				},
				message: link.messageId,
			};
		}),
	);

	return Arr.filter(results, Predicate.isNotNullable);
}

export async function enrichMessageForDisplay(
	ctx: QueryCtxWithCache,
	message: MessageDoc,
	options?: {
		isAnonymous?: boolean;
		skipReference?: boolean;
	},
): Promise<EnrichedMessage> {
	const [author, server, attachments, reactions, solutions, referenceMessage] =
		await Promise.all([
			ctx.cache.getDiscordAccount(message.authorId),
			ctx.cache.getServer(message.serverId),
			ctx.cache.getAttachmentsByMessageId(message.id),
			ctx.cache.getReactionsByMessageId(message.id),
			ctx.cache.getSolutionsByQuestionId(message.id),
			message.referenceId && !options?.skipReference
				? ctx.cache.getMessage(message.referenceId)
				: null,
		]);

	const emojiIds = Arr.dedupe(
		Arr.filter(
			reactions.map((r) => r.emojiId),
			Predicate.isNotNullable,
		),
	);

	const emojis = await Promise.all(
		emojiIds.map((emojiId) => ctx.cache.getEmoji(emojiId)),
	);

	const emojiMap = new Map<
		string,
		{ id: bigint; name: string; animated?: boolean }
	>();
	for (const emoji of emojis) {
		if (emoji) {
			emojiMap.set(emoji.id.toString(), {
				id: emoji.id,
				name: emoji.name,
				animated: emoji.animated,
			});
		}
	}

	const formattedReactions = reactions.map((reaction) => {
		const emoji = emojiMap.get(reaction.emojiId.toString());
		return {
			userId: reaction.userId,
			emoji: emoji ?? {
				id: reaction.emojiId,
				name: "",
			},
		};
	});

	const cdnDomain = process.env.CDN_DOMAIN ?? "cdn.answeroverflow.com";

	const attachmentsWithUrl = await Promise.all(
		attachments.map(async (attachment) => {
			if (attachment.storageId) {
				const url = await ctx.storage.getUrl(attachment.storageId);
				if (!url) {
					return null;
				}
				return { ...attachment, url };
			}
			return {
				...attachment,
				url: `https://${cdnDomain}/${attachment.id}/${attachment.filename}`,
			};
		}),
	);

	const embedsToResolve = message.embeds ?? [];

	const embedsWithResolvedUrls = await Promise.all(
		embedsToResolve.map(async (embed) => {
			const resolvedEmbed = { ...embed };

			if (embed.image?.s3Key) {
				const url = `https://${cdnDomain}/${embed.image.s3Key}`;
				resolvedEmbed.image = { ...embed.image, url, proxyUrl: url };
			} else if (embed.image?.storageId) {
				const url = await ctx.storage.getUrl(embed.image.storageId);
				if (url) {
					resolvedEmbed.image = { ...embed.image, url, proxyUrl: url };
				}
			}

			if (embed.thumbnail?.s3Key) {
				const url = `https://${cdnDomain}/${embed.thumbnail.s3Key}`;
				resolvedEmbed.thumbnail = { ...embed.thumbnail, url, proxyUrl: url };
			} else if (embed.thumbnail?.storageId) {
				const url = await ctx.storage.getUrl(embed.thumbnail.storageId);
				if (url) {
					resolvedEmbed.thumbnail = { ...embed.thumbnail, url, proxyUrl: url };
				}
			}

			if (embed.video?.s3Key) {
				const url = `https://${cdnDomain}/${embed.video.s3Key}`;
				resolvedEmbed.video = { ...embed.video, url, proxyUrl: url };
			} else if (embed.video?.storageId) {
				const url = await ctx.storage.getUrl(embed.video.storageId);
				if (url) {
					resolvedEmbed.video = { ...embed.video, url, proxyUrl: url };
				}
			}

			if (embed.footer?.iconS3Key) {
				const url = `https://${cdnDomain}/${embed.footer.iconS3Key}`;
				resolvedEmbed.footer = {
					...embed.footer,
					iconUrl: url,
					proxyIconUrl: url,
				};
			} else if (embed.footer?.iconStorageId) {
				const url = await ctx.storage.getUrl(embed.footer.iconStorageId);
				if (url) {
					resolvedEmbed.footer = {
						...embed.footer,
						iconUrl: url,
						proxyIconUrl: url,
					};
				}
			}

			if (embed.author?.iconS3Key) {
				const url = `https://${cdnDomain}/${embed.author.iconS3Key}`;
				resolvedEmbed.author = {
					...embed.author,
					iconUrl: url,
					proxyIconUrl: url,
				};
			} else if (embed.author?.iconStorageId) {
				const url = await ctx.storage.getUrl(embed.author.iconStorageId);
				if (url) {
					resolvedEmbed.author = {
						...embed.author,
						iconUrl: url,
						proxyIconUrl: url,
					};
				}
			}

			return resolvedEmbed;
		}),
	);

	let authorData: { id: bigint; name: string; avatar?: string } | null = null;
	if (author) {
		if (options?.isAnonymous) {
			const anonymized = anonymizeDiscordAccount(message.authorId);
			authorData = {
				id: BigInt(anonymized.id),
				name: anonymized.name,
				avatar: anonymized.avatar ?? undefined,
			};
		} else {
			authorData = {
				id: author.id,
				name: author.name,
				avatar: author.avatar,
			};
		}
	}

	let referenceData: EnrichedMessage["reference"];
	if (message.referenceId && !options?.skipReference) {
		if (referenceMessage) {
			const enrichedReference = await enrichMessageForDisplay(
				ctx,
				referenceMessage,
				{ ...options, skipReference: true },
			);
			referenceData = {
				messageId: message.referenceId,
				message: enrichedReference,
			};
		} else {
			referenceData = {
				messageId: message.referenceId,
				message: null,
			};
		}
	}

	const messageWithResolvedEmbeds = embedsWithResolvedUrls
		? { ...message, embeds: embedsWithResolvedUrls }
		: message;

	const baseEnriched: EnrichedMessage = {
		message: messageWithResolvedEmbeds,
		author: authorData,
		attachments: attachmentsWithUrl.filter(Predicate.isNotNullable),
		reactions: formattedReactions,
		solutions,
		...(referenceData !== undefined && { reference: referenceData }),
	};

	if (!server) {
		return baseEnriched;
	}

	const serverDiscordId = server.discordId;
	const { userIds, channelIds } = extractMentionIdsInternal(message.content);
	const messageDiscordLinks = extractDiscordLinksInternal(message.content);

	const mentionMetadata = await getMentionMetadataInternal(
		ctx,
		userIds,
		channelIds,
		serverDiscordId,
	);

	const messageUsers: Record<
		string,
		{
			username: string;
			globalName: string | null;
			url: string;
			exists?: boolean;
		}
	> = {};
	for (const userId of userIds) {
		const userIdStr = userId.toString();
		const user = mentionMetadata.users[userIdStr];
		if (user) {
			messageUsers[userIdStr] = user;
		}
	}

	const messageChannels = Object.fromEntries(
		channelIds.map((id) => {
			const idStr = id.toString();
			return [
				idStr,
				mentionMetadata.channels[idStr] ?? {
					name: "Unknown Channel",
					type: 0,
					url: `https://discord.com/channels/${serverDiscordId}/${id}`,
					indexingEnabled: false,
					exists: false,
				},
			];
		}),
	);

	const messageInternalLinks = await getInternalLinksMetadataInternal(
		ctx,
		messageDiscordLinks,
	);

	return {
		...baseEnriched,
		metadata: {
			users: Object.keys(messageUsers).length > 0 ? messageUsers : undefined,
			channels:
				Object.keys(messageChannels).length > 0 ? messageChannels : undefined,
			internalLinks:
				messageInternalLinks.length > 0 ? messageInternalLinks : undefined,
		},
	};
}
