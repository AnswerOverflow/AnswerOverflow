import { getDefaultChannel, getDefaultServer } from "@answeroverflow/db";
import { ChannelType, PermissionResolvable, PermissionsBitField } from "discord.js";
import { createContextInner } from "../context";

export async function getGeneralScenario() {
  const data = getServerTestData();
  const manage_guild_ctx = await createManageGuildContext(data.server.id, data.server.name);
  const default_ctx = await createDefaultPermissionCtx(data.server.id, data.server.name);
  return { data, manage_guild_ctx, default_ctx };
}

export function getServerTestData(server_id: string = "101") {
  return {
    server: getDefaultServer({
      id: server_id,
      name: "test",
    }),
    channels: [
      getDefaultChannel({
        id: "201",
        name: "name",
        server_id: server_id,
        type: ChannelType.GuildText,
      }),
      getDefaultChannel({
        id: "202",
        name: "name2",
        server_id: server_id,
        type: ChannelType.GuildForum,
      }),
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
