import {
	Message,
	type APIMessage,
	User,
	type APIUser,
	type Channel,
	type APIChannel,
	ChannelType,
	type APIGuildForumTag,
	type GuildForumTag,
	type APITextChannel,
	type APIDMChannel,
	type APIThreadChannel,
	type APIChannelMention,
	ThreadAutoArchiveDuration,
} from 'discord.js';

export function userToAPIUser(user: User): APIUser {
	return {
		id: user.id,
		username: user.username,
		discriminator: user.discriminator,
		avatar: user.avatar,
		accent_color: user.accentColor,
		banner: user.banner,
		bot: user.bot,
		flags: user.flags?.bitfield,
		system: user.system,
	};
}

export function tagToAPIGuildForumTag(tag: GuildForumTag): APIGuildForumTag {
	return {
		emoji_id: tag.emoji?.id ?? null,
		emoji_name: tag.emoji?.name ?? null,
		id: tag.id,
		moderated: tag.moderated,
		name: tag.name,
	};
}

export function channelToAPIChannel(channel: Channel): APIChannel {
	if (channel.isDMBased() && channel.type !== ChannelType.GroupDM) {
		const data: APIDMChannel = {
			id: channel.id,
			type: channel.type,
			flags: channel.flags?.bitfield,
			last_message_id: channel.lastMessageId,
			name: null,
			recipients: [channel.client.user, channel.recipient].map((user) =>
				userToAPIUser(user!),
			), // TODO: Is the bot a recipient?
		};
		return data;
	}
	if (channel.isThread()) {
		const data: APIThreadChannel = {
			applied_tags: channel.appliedTags,
			id: channel.id,
			position: 0,
			type: channel.type,
			flags: channel.flags?.bitfield,
			guild_id: channel.guild?.id,
			last_message_id: channel.lastMessageId,
			member_count: channel.memberCount ?? 0,
			message_count: channel.messageCount ?? 0,
			name: channel.name,
			parent_id: channel.parentId,
			nsfw: false,
			thread_metadata: {
				locked: channel.locked ?? false,
				create_timestamp: channel.createdAt?.toISOString(),
				archive_timestamp:
					channel.archivedAt?.toISOString() ??
					channel.createdAt?.toISOString() ??
					new Date().toISOString(),
				invitable: channel.invitable ?? false,
				auto_archive_duration:
					channel.autoArchiveDuration ?? ThreadAutoArchiveDuration.OneDay,
				archived: channel.archived ?? false,
			},
			owner_id: channel.ownerId ?? undefined,
			total_message_sent: channel.totalMessageSent ?? 0,
			rate_limit_per_user: channel.rateLimitPerUser ?? 0,
			member: undefined, // TODO: Define
		};
		return data;
	}
	if (channel.type === ChannelType.GuildText) {
		const data: APITextChannel = {
			id: channel.id,
			position: channel.position,
			type: channel.type,
			default_auto_archive_duration: channel.defaultAutoArchiveDuration,
			flags: channel.flags?.bitfield,
			guild_id: channel.guild?.id,
			last_message_id: channel.lastMessageId,
			last_pin_timestamp: channel.lastPinAt?.toISOString(),
			name: channel.name,
			nsfw: channel.nsfw,
			parent_id: channel.parentId,
			permission_overwrites: undefined,
			rate_limit_per_user: channel.rateLimitPerUser,
			topic: channel.topic,
		};
		return data;
	}
	throw new Error('Channel type not supported');
}

export function channelToAPIChannelMention(
	channel: Channel,
): APIChannelMention {
	if (channel.isDMBased()) {
		throw new Error('Cannot mention a DM channel');
	}
	return {
		id: channel.id,
		guild_id: channel.guild.id,
		name: channel.name,
		type: channel.type,
	};
}

export function messageToAPIData(message: Message): APIMessage {
	return {
		id: message.id,
		attachments: [],
		author: userToAPIUser(message.author),
		channel_id: message.channel.id,
		content: message.content,
		edited_timestamp: message.editedAt?.toISOString() ?? null,
		embeds: [],
		flags: message.flags?.bitfield,
		mention_everyone: message.mentions.everyone,
		mention_roles: message.mentions.roles.map((role) => role.id),
		mentions: message.mentions.users.map((user) => userToAPIUser(user)),
		pinned: message.pinned,
		timestamp: message.createdAt.toISOString(),
		tts: message.tts,
		type: message.type,
		mention_channels: message.mentions.channels.map(channelToAPIChannelMention),
		nonce: message.nonce ?? undefined,
		position: message.position ?? undefined,
	};
}
