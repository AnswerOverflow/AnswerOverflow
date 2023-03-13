import type {
	AnyThreadChannel,
	Guild,
	GuildBasedChannel,
	GuildChannel,
	GuildMember,
	Message,
	MessageReference,
	User,
} from 'discord.js';
import {
	getDefaultServer,
	Message as AOMessage,
	Channel as AOChannel,
	Server as AOServer,
	DiscordAccount as AODiscordAccount,
	getDefaultChannelWithFlags,
} from '@answeroverflow/db';
import type { DiscordAPIServerSchema } from '@answeroverflow/cache';

export function toAOMessageReference(
	reference: MessageReference,
): AOMessage['messageReference'] {
	if (!reference.messageId) return null;
	if (!reference.guildId) return null;
	return {
		channelId: reference.channelId,
		messageId: reference.messageId,
		serverId: reference.guildId,
	};
}

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

export function toAOMessage(message: Message): AOMessage {
	if (!message.guild) throw new Error('Message is not in a guild');

	const convertedMessage: AOMessage = {
		id: message.id,
		content: message.cleanContent,
		channelId: message.channel.id,
		parentChannelId: message.channel.isThread()
			? message.channel.parentId
			: null,
		attachments: message.attachments.map((attachment) => {
			return {
				id: attachment.id,
				url: attachment.url,
				proxyUrl: attachment.proxyURL,
				filename: attachment.name ?? '',
				size: attachment.size,
				height: attachment.height,
				width: attachment.width,
				contentType: attachment.contentType ?? undefined,
				description: attachment.description ?? '',
				ephemeral: attachment.ephemeral ?? false,
			};
		}),
		applicationId: message.applicationId,
		flags: message.flags.bitfield,
		nonce: message.nonce ? message.nonce.toString() : null,
		tts: message.tts,
		reactions: message.reactions.cache.map((reaction) => ({
			emojiId: reaction.emoji.id,
			emojiName: reaction.emoji.name,
			reactorIds: reaction.users.cache.map((user) => user.id),
		})),
		components: [],
		embeds: [],
		interactionId: message.interaction?.id ?? null,
		mentionChannels: message.mentions.channels.map((channel) => channel.id),
		mentionEveryone: message.mentions.everyone,
		mentionRoles: message.mentions.roles.map((role) => role.id),
		mentions: message.mentions.users.map((user) => user.id),
		pinned: message.pinned,
		stickerIds: message.stickers.map((sticker) => sticker.id),
		type: message.type,
		webhookId: message.webhookId,
		messageReference: message.reference
			? toAOMessageReference(message.reference)
			: null,
		authorId: message.author.id,
		serverId: message.guild?.id,
		solutionIds: [],
		childThreadId: message.thread?.id ?? null,
	};
	return convertedMessage;
}

export function toAODiscordAccount(user: User): AODiscordAccount {
	const convertedUser: AODiscordAccount = {
		id: user.id,
		avatar: user.avatar,
		name: user.username,
	};
	return convertedUser;
}

export function toAOServer(guild: Guild) {
	return getDefaultServer({
		id: guild.id,
		name: guild.name,
		icon: guild.icon,
		description: guild.description,
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

export function messagesToAOMessagesSet(messages: Message[]) {
	const aoMessages = new Map<string, AOMessage>();
	for (const msg of messages) {
		aoMessages.set(msg.id, toAOMessage(msg));
	}
	return Array.from(aoMessages.values());
}
