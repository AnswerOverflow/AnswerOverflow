import type { Guild, GuildBasedChannel } from "discord.js";

export const discordGuildToPrismaServer = (guild: Guild) => {
  return {
    name: guild.name,
    icon: guild.icon,
    id: guild.id,
    kicked_time: null,
  };
};

export const discordChannelToPrismaChannel = (channel: GuildBasedChannel) => {
  return {
    id: channel.id,
    name: channel.name,
    type: 0,
  };
};
