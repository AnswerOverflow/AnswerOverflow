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

type MessageWithServerAndChannel = {
	serverId: string;
	channelId: string;
	id: string;
};

export function getDiscordURLForMessage(message: MessageWithServerAndChannel) {
	const serverId = message.serverId;
	const channelId = message.channelId;
	const messageId = message.id;
	return `https://discord.com/channels/${serverId}/${channelId}/${messageId}`;
}
