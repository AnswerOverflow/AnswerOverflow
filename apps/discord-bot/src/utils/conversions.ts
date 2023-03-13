import {
	AnyThreadChannel,
	ButtonStyle,
	ComponentType,
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

function toAOComponent(
	component: Message['components'][number]['components'][number],
): AOMessage['components'][number]['components'][number] {
	if (component.type === ComponentType.Button) {
		if (component.style === ButtonStyle.Link) {
			return {
				type: component.type,
				label: component.label ?? undefined,
				url: component.url ?? '',
				disabled: component.disabled ?? false,
				style: component.style,
				emoji: component.emoji ?? undefined,
			};
		} else {
			return {
				type: component.type,
				label: component.label ?? undefined,
				customId: component.customId ?? '',
				disabled: component.disabled ?? false,
				style: component.style,
				emoji: component.emoji ?? undefined,
			};
		}
	}
	if (component.type === ComponentType.StringSelect) {
		return {
			type: component.type,
			customId: component.customId ?? '',
			disabled: component.disabled ?? false,
			options: component.options ?? [],
			placeholder: component.placeholder ?? undefined,
			minValues: component.minValues ?? 1,
			maxValues: component.maxValues ?? 1,
		};
	}
	if (component.type === ComponentType.RoleSelect) {
		return {
			type: component.type,
			customId: component.customId ?? '',
			disabled: component.disabled ?? false,
			placeholder: component.placeholder ?? undefined,
			minValues: component.minValues ?? 1,
			maxValues: component.maxValues ?? 1,
		};
	}
	if (component.type === ComponentType.UserSelect) {
		return {
			type: component.type,
			customId: component.customId ?? '',
			disabled: component.disabled ?? false,
			placeholder: component.placeholder ?? undefined,
			minValues: component.minValues ?? 1,
			maxValues: component.maxValues ?? 1,
		};
	}
	if (component.type === ComponentType.ChannelSelect) {
		return {
			type: component.type,
			customId: component.customId ?? '',
			disabled: component.disabled ?? false,
			placeholder: component.placeholder ?? undefined,
			minValues: component.minValues ?? 1,
			maxValues: component.maxValues ?? 1,
		};
	}
	if (component.type === ComponentType.MentionableSelect) {
		return {
			type: component.type,
			customId: component.customId ?? '',
			disabled: component.disabled ?? false,
			placeholder: component.placeholder ?? undefined,
			minValues: component.minValues ?? 1,
			maxValues: component.maxValues ?? 1,
		};
	}
	throw new Error('Unknown component type');
}

// ActionRow<MessageActionRowComponent>[]
function toAOActionRow(
	components: Message['components'],
): AOMessage['components'] {
	return components.map((row) => ({
		type: row.type,
		components: row.components.map(toAOComponent),
	}));
}

// top 10 ugliest functions in this codebase
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
		components: toAOActionRow(message.components),
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
