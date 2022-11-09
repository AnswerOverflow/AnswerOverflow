import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { discordChannelToPrismaChannel } from "./conversion";

export const syncServer = async (guild: Guild) => {
  const filtered_channels = guild.channels.cache.filter((channel) => channel.isText());

  await container.answer_overflow.servers.upsertServer({
    where: {
      id: guild.id,
    },
    update: {
      name: guild.name,
      icon: guild.icon,
      id: guild.id,
      channels: {
        upsert: filtered_channels.map((channel) => {
          const converted_channel = discordChannelToPrismaChannel(channel);
          return {
            where: {
              id: channel.id,
            },
            update: converted_channel,
            create: converted_channel,
          };
        }),
      },
    },
    create: {
      name: guild.name,
      icon: guild.icon,
      id: guild.id,
      channels: {
        connectOrCreate: filtered_channels.map((channel) => ({
          where: {
            id: channel.id,
          },
          create: discordChannelToPrismaChannel(channel),
        })),
      },
    },
  });
};
