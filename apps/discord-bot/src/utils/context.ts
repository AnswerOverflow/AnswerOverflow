import { createBotContext, botRouter } from "@answeroverflow/api";
import type { GuildMember } from "discord.js";
import { container } from "@sapphire/framework";
import assert from "assert";
export async function createUnauthenticatedCtx() {
  const ctx = await createBotContext({
    session: null,
    user_servers: undefined,
  });
  return botRouter.createCaller(ctx);
}

export async function createMemberCtx(member: GuildMember) {
  const guild = member.guild;
  const ctx = await createBotContext({
    session: null,
    discord_account: {
      avatar: member.displayAvatarURL(),
      discriminator: member.user.discriminator,
      username: member.user.username,
      id: member.id,
    },
    // The only server that we care about is the one we are currently interacting with, so only having 1 server makes sense here
    user_servers: [
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
  return ctx;
}

export async function createAnswerOveflowBotCtx() {
  assert(container.client.user, "Client user is not ready");
  const ctx = await createBotContext({
    session: null,
    discord_account: {
      avatar: container.client.user.displayAvatarURL(),
      discriminator: container.client.user.discriminator,
      username: container.client.user.username,
      id: container.client.user.id,
    },
    user_servers: [],
  });
  return ctx;
}
