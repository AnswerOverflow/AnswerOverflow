import {
	type AnyThreadChannel,
	Guild,
	type GuildBasedChannel,
	GuildChannel,
	GuildMember,
	Message,
	User,
} from 'discord.js';
import {
	type Server as AOServer,
	type Channel as AOChannel,
	type DiscordAccount as AODiscordAccount,
	ReactionWithRelations,
} from '@answeroverflow/db/src/schema';
import { type BaseMessageWithRelations as AOMessage } from '@answeroverflow/db';
import type { DiscordAPIServerSchema } from '@answeroverflow/cache';
import { getDefaultServer } from '@answeroverflow/db/src/utils/serverUtils';
import { getDefaultChannelWithFlags } from '@answeroverflow/db/src/utils/channelUtils';

export function toDiscordAPIServer(
	member: GuildMember,
): DiscordAPIServerSchema {
	const guild = member.guild;
	return {
		id: guild.id,
		name: guild.name,
		icon: guild.icon,
		features: guild.features,
		owner: guild.ownerId === member.user.id,
		permissions: Number(member.permissions.bitfield),
	};
}

// top 10 ugliest functions in this codebase
export async function toAOMessage(message: Message): Promise<AOMessage> {
	if (message.partial) {
		message = await message.fetch();
	}
	if (!message.guildId) throw new Error('Message is not in a guild');
	const reactions: ReactionWithRelations[] = [];
	for (const reaction of message.reactions.cache.values()) {
		const users = reaction.users.cache;
		for (const user of users.values()) {
			const emoji = reaction.emoji;
			if (!emoji || !emoji.name || !emoji.id) continue;
			reactions.push({
				userId: user.id,
				messageId: message.id,
				emojiId: emoji.id,
				emoji: {
					id: emoji.id,
					name: emoji.name,
				},
			});
		}
	}

	const convertedMessage: AOMessage = {
		id: message.id,
		content: message.cleanContent,
		channelId: message.channelId,
		parentChannelId: message.channel.isThread()
			? message.channel.parentId
			: null,
		attachments: message.attachments.map((attachment) => {
			return {
				id: attachment.id,
				url: attachment.url,
				messageId: message.id,
				proxyUrl: attachment.proxyURL,
				filename: attachment.name ?? '',
				size: attachment.size,
				height: attachment.height,
				width: attachment.width,
				contentType: attachment.contentType,
				description: attachment.description,
				ephemeral: attachment.ephemeral ?? false,
			};
		}),
		applicationId: message.applicationId,
		flags: message.flags.bitfield,
		nonce: message.nonce ? message.nonce.toString() : null,
		tts: message.tts,
		reactions,
		embeds: message.embeds.map((embed) => ({
			title: embed.title ?? undefined,
			description: embed.description ?? undefined,
			url: embed.url ?? undefined,
			color: embed.color ?? undefined,
			type: undefined,
			timestamp: embed.timestamp ?? undefined,
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
						proxyUrl: embed.image.proxyURL ?? undefined,
						height: embed.image.height ?? undefined,
						width: embed.image.width ?? undefined,
					}
				: undefined,
			video: embed.video
				? {
						height: embed.video.height ?? undefined,
						width: embed.video.width ?? undefined,
						url: embed.video.url,
						proxyUrl: embed.video.proxyURL ?? undefined,
					}
				: undefined,
			provider: embed.provider
				? {
						name: embed.provider.name ?? undefined,
						url: embed.provider.url ?? undefined,
					}
				: undefined,
			thumbnail: embed.thumbnail
				? {
						url: embed.thumbnail.url,
						proxyUrl: embed.thumbnail.proxyURL ?? undefined,
						height: embed.thumbnail.height ?? undefined,
						width: embed.thumbnail.width ?? undefined,
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
		})),
		interactionId: message.interaction?.id ?? null,
		pinned: message.pinned,
		type: message.type,
		webhookId: message.webhookId,
		referenceId: message.reference?.messageId ?? null,
		authorId: message.author.id,
		serverId: message.guildId,
		questionId: null,
		childThreadId: message.thread?.id ?? null,
	};
	return convertedMessage;
}

export function toAODiscordAccount(user: User): AODiscordAccount {
	const convertedUser: AODiscordAccount = {
		id: user.id,
		avatar: user.avatar,
		name: user.displayName,
	};
	return convertedUser;
}

export function getMemberCount(guild: Guild) {
	const aprox = guild.approximateMemberCount;
	const actual = guild.memberCount;
	if (aprox && aprox > actual) return aprox;
	return actual;
}

export function toAOServer(guild: Guild) {
	return getDefaultServer({
		id: guild.id,
		name: guild.name,
		icon: guild.icon,
		description: guild.description,
		vanityInviteCode: guild.vanityURLCode,
		approximateMemberCount:
			getMemberCount(guild) > 0 ? getMemberCount(guild) : undefined,
	});
}

export function toAOChannel(
	channel: GuildChannel | GuildBasedChannel,
): AOChannel {
	if (!channel.guild) throw new Error('Channel is not in a guild');
	const convertedChannel: AOChannel = getDefaultChannelWithFlags({
		id: channel.id,
		name: channel.name,
		type: channel.type,
		parentId: channel.isThread() ? channel.parentId : null,
		serverId: channel.guild.id,
		archivedTimestamp:
			channel.isThread() && channel.archiveTimestamp
				? BigInt(channel.archiveTimestamp)
				: null,
	});
	return convertedChannel;
}

export function toAOChannelWithServer(
	channel: GuildChannel,
): AOChannel & { server: AOServer } {
	const converted = toAOChannel(channel);
	return {
		...converted,
		server: toAOServer(channel.guild),
	};
}

export function toAOThread(thread: AnyThreadChannel): AOChannel {
	if (!thread?.parent?.id) throw new Error('Thread has no parent');

	const convertedThread: AOChannel = getDefaultChannelWithFlags({
		id: thread.id,
		name: thread.name,
		type: thread.type,
		parentId: thread.parent.id,
		serverId: thread.guild.id,
	});
	return convertedThread;
}

export function extractUsersSetFromMessages(messages: Message[]) {
	const users = new Map<string, AODiscordAccount>();
	for (const msg of messages) {
		users.set(msg.author.id, toAODiscordAccount(msg.author));
	}
	return Array.from(users.values());
}

export function extractThreadsSetFromMessages(messages: Message[]) {
	const threads = new Map<string, AOChannel>();
	for (const msg of messages) {
		if (msg.thread) {
			threads.set(msg.thread.id, toAOThread(msg.thread));
		}
	}
	return Array.from(threads.values());
}

export async function messagesToAOMessagesSet(messages: Message[]) {
	const aoMessages = new Map<string, AOMessage>();
	for await (const msg of messages) {
		const converted = await toAOMessage(msg);
		aoMessages.set(msg.id, converted);
	}
	return Array.from(aoMessages.values());
}
