import type { Channel, Server } from "@answeroverflow/core";
import type { Guild, GuildBasedChannel } from "discord.js";

export const discordGuildToPrismaServer = (guild: Guild): Server => {
  return {
    name: guild.name,
    icon: guild.icon,
    id: guild.id,
    kicked_time: null,
  };
};

export const discordChannelToPrismaChannel = (channel: GuildBasedChannel): Channel => {
  return {
    id: channel.id,
    name: channel.name,
    type: 0,
    server_id: channel.guild.id,
  };
};
