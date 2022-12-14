import { botRouter, BotRouterCaller, createBotContext } from "@answeroverflow/api";
import { container } from "@sapphire/framework";
import { TRPCError } from "@trpc/server";
import type { CommandInteraction, GuildMember } from "discord.js";
import type { ComponentEvent } from "@answeroverflow/reacord";
import { ephemeralReply } from "~test/utils/reacord/reacord-utils";

type TRPCall<T> = {
  // eslint-disable-next-line no-unused-vars
  ApiCall: (router: BotRouterCaller) => Promise<T>;
  // eslint-disable-next-line no-unused-vars
  Ok: (result: T) => void;
  // eslint-disable-next-line no-unused-vars
  Error: (error: TRPCError) => void;
  member?: GuildMember;
};

// TODO: This function can be cleaned up
export async function createBotRouter(member?: GuildMember): Promise<BotRouterCaller> {
  let ctx = await createBotContext({
    session: null, // Some bot calls may be performed without a member, this allows that to happen
    user_servers: null,
  });
  if (member) {
    const guild = member.guild;
    ctx = await createBotContext({
      session: {
        expires: new Date().toUTCString(),
        // TODO: Create a real user object & pass it here, currently mocking with fake user data.
        user: {
          email: null,
          image: member.displayAvatarURL(),
          name: member.displayName,
          id: member.id,
        },
      },
      user_servers: [
        // The only server that we care about is the one we are currently interacting with, so only having 1 server makes sense here
        {
          name: guild.name,
          id: guild.id,
          features: guild.features,
          // Permissions are the member permissions that tRPC validates match the required flags
          permissions: member.permissions.bitfield as unknown as number, // TODO: Handle bigint better
          icon: guild.iconURL(),
          owner: guild.ownerId === member.id,
        },
      ],
    });
  }
  return botRouter.createCaller(ctx);
}

export async function callAPI<T>({ ApiCall, Ok, Error, member }: TRPCall<T>): Promise<void> {
  try {
    const caller = await createBotRouter(member); // Create the trpcCaller passing in member to make the context
    const data = await ApiCall(caller); // Pass in the caller we created to ApiCall to make the request
    Ok(data); // If no errors, Ok gets called with the API data
  } catch (error) {
    if (error instanceof TRPCError) {
      Error(error);
    } else {
      throw error;
    }
  }
}

export async function callApiWithEphemeralErrorHandler<T>(
  call: Omit<TRPCall<T>, "Error">,
  interaction: CommandInteraction
) {
  await callAPI({
    ...call,
    Error(error) {
      ephemeralReply(container.reacord, "Error: " + error.message, interaction);
    },
  });
}

export async function callApiWithButtonErrorHandler<T>(
  call: Omit<TRPCall<T>, "Error">,
  interaction: ComponentEvent
) {
  await callAPI({
    ...call,
    Error(error) {
      interaction.ephemeralReply("Error: " + error.message);
    },
  });
}
