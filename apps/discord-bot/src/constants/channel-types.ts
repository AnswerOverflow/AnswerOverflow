import { ChannelType } from "discord.js";

export const ALLOWED_AUTO_THREAD_CHANNEL_TYPES = new Set([
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
]);
