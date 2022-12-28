import {
  getDefaultChannel,
  getDefaultMessage,
  getDefaultServer,
  getDefaultThread,
} from "@answeroverflow/db";
import { ChannelType, PermissionResolvable, PermissionsBitField } from "discord.js";
import { createContextInner } from "~api/router/context";

export async function getGeneralScenario() {
  const data = getServerTestData();
  const manage_guild_ctx = await createManageGuildContext(data.server.id, data.server.name);
  const default_ctx = await createDefaultPermissionCtx(data.server.id, data.server.name);
  return { data, manage_guild_ctx, default_ctx };
}

export function getServerTestData(server_id: string = "101") {
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
  return {
    server,
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
          getDefaultThread({
            id: "401",
            name: "name",
            parent_id: "201",
            server_id: server_id,
            type: ChannelType.PublicThread,
          }),
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

export function createManageGuildContext(server_id: string, server_name: string) {
  return createCtxWithServers(server_id, server_name, "ManageGuild");
}

export function createDefaultPermissionCtx(server_id: string, server_name: string) {
  return createCtxWithServers(server_id, server_name, PermissionsBitField.Default);
}

export function createCtxWithServers(
  server_id: string,
  server_name: string,
  permissions: PermissionResolvable
) {
  return createContextInner({
    session: {
      user: {
        id: "1",
        name: "test",
      },
      expires: new Date().toString(),
    },
    caller: "discord-bot",
    user_servers: [
      {
        features: [],
        id: server_id,
        name: server_name,
        owner: true,
        icon: null,
        permissions: Number(PermissionsBitField.resolve(permissions)),
      },
    ],
  });
}

export type ServerTestData = ReturnType<typeof getServerTestData>;
