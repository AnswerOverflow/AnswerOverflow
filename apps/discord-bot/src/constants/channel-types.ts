import { ChannelType } from "discord.js";

/**
 * Channel types that support auto threading
 */
export const ALLOWED_AUTO_THREAD_CHANNEL_TYPES = new Set([
	ChannelType.GuildText,
	ChannelType.GuildAnnouncement,
]);
