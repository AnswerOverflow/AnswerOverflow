import type { Infer } from "convex/values";
import { getManyFrom, getOneFrom } from "convex-helpers/server/relationships";
import { Array as Arr, Predicate } from "effect";
import type { Doc } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../client";
import type { attachmentSchema, emojiSchema, messageSchema } from "../schema";
import { anonymizeDiscordAccount } from "./anonymization.js";

type Message = Infer<typeof messageSchema>;
type MessageDoc = Doc<"messages">;
type AttachmentDoc = Doc<"attachments"> & { url: string };
export type DatabaseAttachment = Infer<typeof attachmentSchema>;

export async function getMessageById(ctx: QueryCtx | MutationCtx, id: bigint) {
	return await getOneFrom(ctx.db, "messages", "by_messageId", id, "id");
}

export function compareIds(a: bigint, b: bigint): number {
	return a > b ? 1 : a < b ? -1 : 0;
}

export async function getFirstMessageInChannel(
	ctx: QueryCtx | MutationCtx,
	channelId: bigint,
): Promise<MessageDoc | null> {
	const firstMessage = await ctx.db
		.query("messages")
		.withIndex("by_channelId_and_id", (q) => q.eq("channelId", channelId))
		.order("asc")
		.first();

	return firstMessage ?? null;
}

export async function getThreadStartMessage(
	ctx: QueryCtx | MutationCtx,
	threadId: bigint,
): Promise<MessageDoc | null> {
	return getOneFrom(ctx.db, "messages", "by_messageId", threadId, "id");
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

async function findAttachmentsByMessageIdInternal(
	ctx: QueryCtx | MutationCtx,
	messageId: bigint,
) {
	return await getManyFrom(
		ctx.db,
		"attachments",
		"by_messageId",
		messageId,
		"messageId",
	);
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

async function getDiscordAccountByIdInternal(
	ctx: QueryCtx | MutationCtx,
	id: bigint,
) {
	return await getOneFrom(
		ctx.db,
		"discordAccounts",
		"by_discordAccountId",
		id,
		"id",
	);
}

async function getServerByDiscordIdInternal(
	ctx: QueryCtx | MutationCtx,
	discordId: bigint,
) {
	return await getOneFrom(ctx.db, "servers", "by_discordId", discordId);
}

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
	ctx: QueryCtx | MutationCtx,
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

	for (const userId of userIds) {
		const account = await getDiscordAccountByIdInternal(ctx, userId);
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

	for (const channelId of channelIds) {
		const [channel, settings] = await Promise.all([
			getOneFrom(ctx.db, "channels", "by_discordChannelId", channelId, "id"),
			getOneFrom(ctx.db, "channelSettings", "by_channelId", channelId),
		]);

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
	ctx: QueryCtx | MutationCtx,
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
				getOneFrom(ctx.db, "servers", "by_discordId", link.guildId),
				getOneFrom(
					ctx.db,
					"channels",
					"by_discordChannelId",
					link.channelId,
					"id",
				),
				getOneFrom(ctx.db, "channelSettings", "by_channelId", link.channelId),
			]);

			if (!server || !channel) {
				return undefined;
			}

			if (link.messageId) {
				const message = await getMessageById(ctx, link.messageId);
				if (!message) {
					return undefined;
				}
			}

			const parentChannel = channel.parentId
				? await getOneFrom(
						ctx.db,
						"channels",
						"by_discordChannelId",
						channel.parentId,
						"id",
					)
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
	ctx: QueryCtx | MutationCtx,
	message: MessageDoc,
	options?: { isAnonymous?: boolean; skipReference?: boolean },
): Promise<EnrichedMessage> {
	const [author, server, attachments, reactions, solutions, referenceMessage] =
		await Promise.all([
			getDiscordAccountByIdInternal(ctx, message.authorId),
			getServerByDiscordIdInternal(ctx, message.serverId),
			findAttachmentsByMessageIdInternal(ctx, message.id),
			findReactionsByMessageId(ctx, message.id),
			findSolutionsByQuestionId(ctx, message.id),
			message.referenceId && !options?.skipReference
				? getMessageById(ctx, message.referenceId)
				: null,
		]);

	const emojiIds = Arr.dedupe(
		Arr.filter(
			reactions.map((r) => r.emojiId),
			Predicate.isNotNullable,
		),
	);

	const emojis = await Promise.all(
		emojiIds.map((emojiId) =>
			getOneFrom(ctx.db, "emojis", "by_emojiId", emojiId, "id"),
		),
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
				return {
					...attachment,
					url,
				};
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
				resolvedEmbed.thumbnail = {
					...embed.thumbnail,
					url,
					proxyUrl: url,
				};
			} else if (embed.thumbnail?.storageId) {
				const url = await ctx.storage.getUrl(embed.thumbnail.storageId);
				if (url) {
					resolvedEmbed.thumbnail = {
						...embed.thumbnail,
						url,
						proxyUrl: url,
					};
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
