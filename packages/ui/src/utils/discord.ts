import { Hash, MessageSquare } from "lucide-react";

export enum ChannelType {
	GuildText = 0,
	DM = 1,
	GuildVoice = 2,
	GroupDM = 3,
	GuildCategory = 4,
	GuildAnnouncement = 5,
	AnnouncementThread = 10,
	PublicThread = 11,
	PrivateThread = 12,
	GuildStageVoice = 13,
	GuildDirectory = 14,
	GuildForum = 15,
	GuildNews = 5,
	GuildNewsThread = 10,
	GuildPublicThread = 11,
	GuildPrivateThread = 12,
}

export function getChannelIcon(type: number) {
	if (type === ChannelType.GuildForum) return MessageSquare;
	return Hash;
}

type MessageWithServerAndChannel = {
	serverId: bigint;
	channelId: bigint;
	id: bigint;
};

export function getDiscordURLForMessage(message: MessageWithServerAndChannel) {
	const serverId = message.serverId.toString();
	const channelId = message.channelId.toString();
	const messageId = message.id.toString();
	return `https://discord.com/channels/${serverId}/${channelId}/${messageId}`;
}
