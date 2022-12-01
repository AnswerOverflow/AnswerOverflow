import {
  botRouter,
  ChannelUpsertInput,
  createBotContext,
  CreateBotContextOptions,
  ServerUpsertInput,
} from "@answeroverflow/api";
import type { User } from "discord.js";

export async function makeAPICaller(
  user: User,
  servers: Exclude<CreateBotContextOptions["user_servers"], null>
): Promise<ReturnType<typeof botRouter["createCaller"]>> {
  const ctx = await createBotContext({
    session: {
      expires: new Date().toUTCString(),
      user: {
        email: null,
        image: user.displayAvatarURL(),
        name: user.username,
      },
    },
    user_servers: servers,
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
