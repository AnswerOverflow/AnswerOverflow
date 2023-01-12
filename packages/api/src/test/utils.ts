import {
  DiscordAccount,
  getDefaultChannel,
  getDefaultDiscordAccount,
  getDefaultMessage,
  getDefaultServer,
  getDefaultThread,
} from "@answeroverflow/db";
import { ChannelType, PermissionResolvable, PermissionsBitField } from "discord.js";
import { createContextInner } from "~api/router/context";

export async function getGeneralScenario() {
  const data1 = await getServerTestData();
  return { data1 };
}

export async function getServerTestData(server_id: string = "101") {
  const account1_guild_manager = getDefaultDiscordAccount({
    id: "1",
    name: "test-user-owner",
  });
  const account2_default_member = getDefaultDiscordAccount({
    id: "2",
    name: "test-user-default",
  });
  const server = getDefaultServer({
    id: server_id,
    name: "test",
  });
  const text_channel = getDefaultChannel({
    id: "201",
    name: "name",
    server_id: server_id,
    type: ChannelType.GuildText,
  });

  const forum_channel = getDefaultChannel({
    id: "202",
    name: "name2",
    server_id: server_id,
    type: ChannelType.GuildForum,
  });
  const account1_guild_manager_ctx = await createManageGuildContext({
    server: {
      id: server.id,
      name: server.name,
    },
    user: account1_guild_manager,
  });
  const account2_default_member_ctx = await createDefaultPermissionCtx({
    server: {
      id: server.id,
      name: server.name,
    },
    user: account2_default_member,
  });
  const bot_caller_ctx = await createBotCallerCtx();

  return {
    server,
    bot_caller_ctx,
    account1_guild_manager,
    account1_guild_manager_ctx,
    account2_default_member,
    account2_default_member_ctx,
    forum_channels: [
      {
        channel: forum_channel,
        messages: {
          account1_messages: [
            getDefaultMessage({
              id: "301",
              channel_id: forum_channel.id,
              server_id: server_id,
              author_id: account1_guild_manager.id,
            }),
          ],
        },
      },
    ],
    text_channels: [
      {
        channel: text_channel,
        threads: [
          {
            thread: getDefaultThread({
              id: "401",
              name: "name",
              parent_id: "201",
              server_id: server_id,
              type: ChannelType.PublicThread,
            }),
            messages: [],
          },
        ],
        messages: {
          account1_messages: [
            getDefaultMessage({
              id: "300",
              channel_id: text_channel.id,
              server_id: server_id,
              author_id: account1_guild_manager.id,
            }),
          ],
          account2_messages: [
            getDefaultMessage({
              id: "304",
              channel_id: text_channel.id,
              server_id: server_id,
              author_id: account2_default_member.id,
            }),
          ],
        },
      },
    ],
  };
}

export function createBotCallerCtx() {
  return createContextInner({
    session: null,
    caller: "discord-bot",
    user_servers: undefined,
    discord_account: {
      id: process.env.DISCORD_CLIENT_ID ?? process.env.VITE_DISCORD_CLIENT_ID,
      avatar: null,
      username: "test",
      discriminator: "0000",
    },
  });
}

type CtxOverride = {
  server: {
    id: string;
    name: string;
  };
  permissions: PermissionResolvable;
  user: DiscordAccount;
};

export function createManageGuildContext(input: Omit<CtxOverride, "permissions">) {
  return createCtxWithServers({
    ...input,
    permissions: PermissionsBitField.resolve("ManageGuild"),
  });
}

export function createDefaultPermissionCtx(input: Omit<CtxOverride, "permissions">) {
  return createCtxWithServers({
    ...input,
    permissions: PermissionsBitField.Default,
  });
}

export function createCtxWithServers(input: CtxOverride) {
  return createContextInner({
    session: null,
    caller: "discord-bot",
    discord_account: {
      id: input.user.id,
      avatar: null,
      username: input.user.name,
      discriminator: "0000",
    },
    user_servers: [
      {
        features: [],
        id: input.server.id,
        name: input.server.name,
        owner: true,
        icon: null,
        permissions: Number(PermissionsBitField.resolve(input.permissions)),
      },
    ],
  });
}

export type ServerTestData = Awaited<ReturnType<typeof getServerTestData>>;
