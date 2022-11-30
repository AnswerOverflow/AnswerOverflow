import {
  botRouter,
  ChannelUpsertInput,
  createBotContext,
  ServerUpsertInput,
} from "@answeroverflow/api";

export async function makeAPICaller(): Promise<ReturnType<typeof botRouter["createCaller"]>> {
  const ctx = await createBotContext();
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
    },
    update: {
      name: channel.name,
    },
    server: { ...makeServerUpsert(server) },
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
