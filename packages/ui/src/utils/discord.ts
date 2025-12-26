import { MessageType } from "discord-api-types/payloads/v10";
import {
	Hash,
	Megaphone,
	MessageSquare,
	MessageSquarePlus,
	Pencil,
	Pin,
	Rocket,
	UserPlus,
} from "lucide-react";

export { MessageType };

export function isSystemMessage(type: number | undefined): boolean {
	if (type === undefined) return false;
	return type !== MessageType.Default && type !== MessageType.Reply;
}

export function getSystemMessageIcon(type: number | undefined) {
	switch (type) {
		case MessageType.ChannelNameChange:
			return Pencil;
		case MessageType.ChannelPinnedMessage:
			return Pin;
		case MessageType.UserJoin:
			return UserPlus;
		case MessageType.GuildBoost:
		case MessageType.GuildBoostTier1:
		case MessageType.GuildBoostTier2:
		case MessageType.GuildBoostTier3:
			return Rocket;
		case MessageType.ThreadCreated:
			return MessageSquarePlus;
		default:
			return MessageSquare;
	}
}

export function getSystemMessageContent(
	type: number | undefined,
	authorName: string,
	content: string,
): string | null {
	if (type === undefined) return null;
	switch (type) {
		case MessageType.ChannelNameChange:
			return `${authorName} changed the post title: ${content}`;
		case MessageType.ChannelPinnedMessage:
			return `${authorName} pinned a message to this channel.`;
		case MessageType.UserJoin:
			return `${authorName} joined the server.`;
		case MessageType.GuildBoost:
		case MessageType.GuildBoostTier1:
		case MessageType.GuildBoostTier2:
		case MessageType.GuildBoostTier3:
			return `${authorName} just boosted the server!`;
		case MessageType.ThreadCreated:
			return `${authorName} started a thread.`;
		default:
			return null;
	}
}

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
	if (type === ChannelType.GuildAnnouncement) return Megaphone;
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
