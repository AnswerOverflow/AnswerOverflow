import { container } from "@sapphire/framework";
import type { Guild } from "discord.js";
import { discordChannelToPrismaChannel, discordGuildToPrismaServer } from "./conversion";

export const syncServer = async (guild: Guild) => {
  const filtered_channels = guild.channels.cache.filter((channel) => channel.isText());
  const converted_server = discordGuildToPrismaServer(guild);
  await container.answer_overflow.servers.upsertServer({
    where: {
      id: guild.id,
    },
    update: {
      ...converted_server,
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
      ...converted_server,
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
