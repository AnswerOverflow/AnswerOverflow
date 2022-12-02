import {
  botRouter,
  BotRouterCaller,
  ChannelUpsertInput,
  createBotContext,
  ServerUpsertInput,
} from "@answeroverflow/api";
import { container } from "@sapphire/framework";
import type { TRPCError } from "@trpc/server";
import type { CommandInteraction, GuildMember } from "discord.js";

export async function makeMemberAPICaller(member?: GuildMember): Promise<BotRouterCaller> {
  let ctx = await createBotContext({
    session: null,
    user_servers: null,
  });
  if (member) {
    ctx = await createBotContext({
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
  }
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

type TRPCall<T> = {
  // eslint-disable-next-line no-unused-vars
  ApiCall: (router: BotRouterCaller) => Promise<T>;
  // eslint-disable-next-line no-unused-vars
  Ok: (result: T) => void;
  // eslint-disable-next-line no-unused-vars
  Error: (error: TRPCError) => void;
  member?: GuildMember;
};

export async function callAPI<T>({ ApiCall, Ok, Error, member }: TRPCall<T>): Promise<void> {
  try {
    const caller = await makeMemberAPICaller(member);
    const data = await ApiCall(caller);
    Ok(data);
  } catch (error) {
    Error(error as TRPCError);
  }
}

export async function callAPIEphemeralErrorHandler<T>(
  call: Omit<TRPCall<T>, "Error">,
  interaction: CommandInteraction
) {
  await callAPI({
    ...call,
    Error(error) {
      container.reacord.ephemeralReply(interaction, "Error: " + error.message);
    },
  });
}
