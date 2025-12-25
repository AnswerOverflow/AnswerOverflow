import type {
	Channel as AOChannel,
	DiscordAccount as AODiscordAccount,
	Emoji as AOEmoji,
	ForumTag as AOForumTag,
	Sticker as AOSticker,
} from "@packages/database/convex/schema";
import type { DatabaseAttachment } from "@packages/database/convex/shared/shared";
import type { BaseMessageWithRelations } from "@packages/database/database";
import {
	type AnyThreadChannel,
	type Channel,
	ChannelType,
	type ForumChannel,
	type GuildBasedChannel,
	type GuildChannel,
	type Message,
	type NewsChannel,
	type PublicThreadChannel,
	type TextChannel,
	type User,
} from "discord.js";
import { Effect } from "effect";
import { Discord } from "../core/discord-service";

// Helper functions to convert Discord string IDs to bigint
export function toBigIntId(id: string | undefined | null): bigint | undefined {
	return id ? BigInt(id) : undefined;
}

const ALLOWED_ROOT_CHANNEL_TYPES = new Set([
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
	ChannelType.GuildForum,
]); // GuildText, GuildAnnouncement, GuildForum
const ALLOWED_THREAD_TYPES = new Set([
	ChannelType.PublicThread,
	ChannelType.AnnouncementThread,
]);

export function isAllowedRootChannelType(channelType: number) {
	return ALLOWED_ROOT_CHANNEL_TYPES.has(channelType);
}

export function isAllowedRootChannel(
	channel: Channel,
): channel is TextChannel | NewsChannel | ForumChannel {
	return isAllowedRootChannelType(channel.type);
}

function isAllowedThreadType(channelType: number): boolean {
	return ALLOWED_THREAD_TYPES.has(channelType);
}

export function isAllowedThreadChannel(
	channel: Channel,
): channel is PublicThreadChannel {
	return isAllowedThreadType(channel.type);
}

function isForumChannel(
	channel: GuildChannel | GuildBasedChannel | AnyThreadChannel,
): channel is ForumChannel {
	return channel.type === ChannelType.GuildForum;
}

export function toAODiscordAccount(user: User): AODiscordAccount {
	return {
		id: BigInt(user.id),
		name: user.displayName ?? user.username,
		avatar: user.avatar ?? undefined,
	};
}

export function toAOChannel(
	channel: GuildChannel | GuildBasedChannel | AnyThreadChannel,
) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const isThread = channel.isThread();
		const parentId =
			isThread && channel.parentId ? channel.parentId : undefined;
		const archivedTimestamp =
			isThread && channel.archiveTimestamp
				? channel.archiveTimestamp
				: undefined;
		const botPermissions = yield* discord.getBotPermissionsForChannel(
			channel.id,
			channel.guild.id,
		);
		let availableTags: AOForumTag[] | undefined;
		if (isForumChannel(channel)) {
			if (channel.availableTags) {
				availableTags = channel.availableTags.map((tag) => ({
					id: BigInt(tag.id),
					name: tag.name,
					moderated: tag.moderated,
					emojiId: tag.emoji?.id ? BigInt(tag.emoji.id) : undefined,
					emojiName: tag.emoji?.name ?? undefined,
				}));
			}
		}

		return {
			id: BigInt(channel.id),
			serverId: BigInt(channel.guild.id),
			name: channel.name ?? "",
			type: channel.type,
			parentId: toBigIntId(parentId),
			archivedTimestamp: archivedTimestamp,
			botPermissions: botPermissions ?? undefined,
			availableTags,
		} satisfies AOChannel;
	});
}

export async function toAOMessage(
	message: Message,
	discordServerId: string,
): Promise<BaseMessageWithRelations> {
	if (message.partial) {
		message = await message.fetch();
	}

	if (!message.guildId) {
		throw new Error("Message is not in a guild");
	}

	const reactions: Array<{
		userId: bigint;
		emoji: AOEmoji;
	}> = [];

	for (const reaction of message.reactions.cache.values()) {
		const emoji = reaction.emoji;
		if (!emoji.name || !emoji.id) continue;

		try {
			const users = await reaction.users.fetch({ limit: 100 });
			for (const user of users.values()) {
				reactions.push({
					userId: BigInt(user.id),
					emoji: {
						id: BigInt(emoji.id),
						name: emoji.name,
						animated: emoji.animated ?? undefined,
					},
				});
			}
		} catch (error) {
			console.warn(`Failed to fetch users for reaction ${emoji.name}:`, error);
		}
	}

	const attachments: DatabaseAttachment[] = message.attachments.map(
		(attachment) => ({
			id: BigInt(attachment.id),
			messageId: BigInt(message.id),
			contentType: attachment.contentType ?? undefined,
			filename: attachment.name ?? "",
			width: attachment.width ?? undefined,
			height: attachment.height ?? undefined,
			size: attachment.size,
			description: attachment.description ?? undefined,
			storageId: undefined,
		}),
	);

	const embeds = message.embeds.map((embed) => ({
		title: embed.title ?? undefined,
		type: undefined, // Discord embed type is deprecated, not storing
		description: embed.description ?? undefined,
		url: embed.url ?? undefined,
		timestamp: embed.timestamp
			? new Date(embed.timestamp).toISOString()
			: undefined,
		color: embed.color ?? undefined,
		footer: embed.footer
			? {
					text: embed.footer.text,
					iconUrl: embed.footer.iconURL ?? undefined,
					proxyIconUrl: embed.footer.proxyIconURL ?? undefined,
				}
			: undefined,
		image: embed.image
			? {
					url: embed.image.url,
					proxyUrl: embed.image.url ?? undefined,
					height: embed.image.height ?? undefined,
					width: embed.image.width ?? undefined,
				}
			: undefined,
		thumbnail: embed.thumbnail
			? {
					url: embed.thumbnail.url,
					proxyUrl: embed.thumbnail.url ?? undefined,
					height: embed.thumbnail.height ?? undefined,
					width: embed.thumbnail.width ?? undefined,
				}
			: undefined,
		video: embed.video
			? {
					url: embed.video.url,
					proxyUrl: embed.video.url ?? undefined,
					height: embed.video.height ?? undefined,
					width: embed.video.width ?? undefined,
				}
			: undefined,
		provider: embed.provider
			? {
					name: embed.provider.name ?? undefined,
					url: embed.provider.url ?? undefined,
				}
			: undefined,
		author: embed.author
			? {
					name: embed.author.name ?? undefined,
					url: embed.author.url ?? undefined,
					iconUrl: embed.author.iconURL ?? undefined,
					proxyIconUrl: embed.author.proxyIconURL ?? undefined,
				}
			: undefined,
		fields: embed.fields.map((field) => ({
			name: field.name,
			value: field.value,
			inline: field.inline ?? false,
		})),
	}));

	const stickers: AOSticker[] = message.stickers.map((sticker) => ({
		id: BigInt(sticker.id),
		name: sticker.name,
		formatType: sticker.format,
	}));

	const parentChannelId = message.channel.isThread()
		? (message.channel.parentId ?? undefined)
		: undefined;

	const convertedMessage: BaseMessageWithRelations = {
		id: BigInt(message.id),
		authorId: BigInt(message.author.id),
		serverId: BigInt(discordServerId),
		channelId: BigInt(message.channelId),
		parentChannelId: toBigIntId(parentChannelId),
		childThreadId: toBigIntId(
			message.thread?.id ??
				(message?.hasThread ? message.id : undefined) ??
				(message.channelId === message.id ? message.id : undefined),
		),
		questionId: undefined,
		referenceId: toBigIntId(message.reference?.messageId),
		applicationId: toBigIntId(message.applicationId),
		interactionId: toBigIntId(message.interaction?.id),
		webhookId: toBigIntId(message.webhookId),
		content: message.content,
		flags: message.flags.bitfield,
		type: message.type,
		pinned: message.pinned ?? false,
		nonce: message.nonce?.toString() ?? undefined,
		tts: message.tts ?? false,
		embeds: embeds.length > 0 ? embeds : undefined,
		stickers: stickers.length > 0 ? stickers : undefined,
		attachments: attachments.length > 0 ? attachments : undefined,
		reactions: reactions.length > 0 ? reactions : undefined,
	};

	return convertedMessage;
}

export function toUpsertMessageArgs(data: BaseMessageWithRelations) {
	return {
		message: {
			id: data.id,
			authorId: data.authorId,
			serverId: data.serverId,
			channelId: data.channelId,
			parentChannelId: data.parentChannelId,
			childThreadId: data.childThreadId,
			questionId: data.questionId,
			referenceId: data.referenceId,
			applicationId: data.applicationId,
			interactionId: data.interactionId,
			webhookId: data.webhookId,
			content: data.content,
			flags: data.flags,
			type: data.type,
			pinned: data.pinned,
			nonce: data.nonce,
			tts: data.tts,
			embeds: data.embeds,
			stickers: data.stickers,
		},
		attachments: data.attachments,
		reactions: data.reactions,
	};
}

export interface EmbedImageToUpload {
	url: string;
	messageId: bigint;
	embedIndex: number;
	field: "image" | "thumbnail" | "video" | "footerIcon" | "authorIcon";
}

export function extractEmbedImagesToUpload(
	message: Message,
): EmbedImageToUpload[] {
	const result: EmbedImageToUpload[] = [];
	const messageId = BigInt(message.id);

	message.embeds.forEach((embed, embedIndex) => {
		if (embed.image?.url) {
			result.push({
				url: embed.image.url,
				messageId,
				embedIndex,
				field: "image",
			});
		}

		if (embed.thumbnail?.url) {
			result.push({
				url: embed.thumbnail.url,
				messageId,
				embedIndex,
				field: "thumbnail",
			});
		}

		if (embed.video?.url) {
			result.push({
				url: embed.video.url,
				messageId,
				embedIndex,
				field: "video",
			});
		}

		if (embed.footer?.proxyIconURL) {
			result.push({
				url: embed.footer.proxyIconURL,
				messageId,
				embedIndex,
				field: "footerIcon",
			});
		}

		if (embed.author?.proxyIconURL) {
			result.push({
				url: embed.author.proxyIconURL,
				messageId,
				embedIndex,
				field: "authorIcon",
			});
		}
	});

	return result;
}
