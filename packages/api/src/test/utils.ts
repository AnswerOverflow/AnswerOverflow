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
  const guild_manager_member = getDefaultDiscordAccount({
    id: "1",
    name: "test-user-owner",
  });
  const guild_default_member = getDefaultDiscordAccount({
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
  const manage_guild_ctx = await createManageGuildContext({
    server: {
      id: server.id,
      name: server.name,
    },
    user: guild_manager_member,
  });
  const default_ctx = await createDefaultPermissionCtx({
    server: {
      id: server.id,
      name: server.name,
    },
    user: guild_default_member,
  });
  const bot_caller_ctx = await createBotCallerCtx();

  return {
    server,
    manage_guild_ctx,
    bot_caller_ctx,
    guild_default_member,
    guild_manager_member,
    default_ctx,
    forum_channels: [
      {
        channel: forum_channel,
        messages: [
          getDefaultMessage({
            id: "301",
            channel_id: forum_channel.id,
            server_id: server_id,
            author_id: "1",
          }),
        ],
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
        messages: [
          getDefaultMessage({
            id: "300",
            channel_id: text_channel.id,
            server_id: server_id,
            author_id: "1",
          }),
          getDefaultMessage({
            id: "304",
            channel_id: text_channel.id,
            server_id: server_id,
            author_id: "1",
          }),
        ],
      },
    ],
  };
}

export function createBotCallerCtx() {
  return createContextInner({
    session: {
      user: {
        id: "AnswerOverflow",
        name: "test",
        email: null,
        image: null,
      },
      expires: new Date().toString(),
    },
    caller: "discord-bot",
    user_servers: undefined,
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
    session: {
      user: {
        id: input.user.id,
        name: input.user.name,
      },
      expires: new Date().toString(),
    },
    caller: "discord-bot",
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
