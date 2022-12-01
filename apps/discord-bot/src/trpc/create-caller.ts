import {
  botRouter,
  ChannelUpsertInput,
  createBotContext,
  ServerUpsertInput,
} from "@answeroverflow/api";
import type { GuildMember } from "discord.js";

export async function makeMemberAPICaller(
  member: GuildMember
): Promise<ReturnType<typeof botRouter["createCaller"]>> {
  const ctx = await createBotContext({
    session: {
      expires: new Date().toUTCString(),
      user: {
        email: null,
        image: member.displayAvatarURL(),
        name: member.displayName,
      },
    },
    user_servers: [
      {
        name: member.guild.name,
        id: member.guild.id,
        features: member.guild.features,
        permissions: member.permissions.bitfield.toString(),
        icon: member.guild.iconURL(),
        owner: member.guild.ownerId === member.id,
      },
    ],
  });
  return botRouter.createCaller(ctx);
}

interface Channel {
  id: string;
  name: string;
  type: number;
}

export function makeChannelUpsert(channel: Channel, server: Server): ChannelUpsertInput {
  return {
    create: {
      id: channel.id,
      name: channel.name,
      type: channel.type,
      server: { ...makeServerUpsert(server) },
    },
    update: {
      name: channel.name,
    },
  };
}

interface Server {
  id: string;
  name: string;
}

export function makeServerUpsert(server: Server): ServerUpsertInput {
  return {
    create: {
      id: server.id,
      name: server.name,
    },
    update: {
      name: server.name,
    },
  };
}
