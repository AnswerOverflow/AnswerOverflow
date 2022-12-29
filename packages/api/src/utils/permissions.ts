import { TRPCError } from "@trpc/server";
import { PermissionsBitField } from "discord.js";
import type { Context } from "~api/router/context";

export const MISSING_PERMISSIONS_MESSAGE = "You are missing the required permissions to do this";

export function assertCanEditServer(ctx: Context, server_id: string) {
  if (ctx.session && ctx.session.user.id === "AnswerOverflow") return;
  if (!ctx.user_servers) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to edit this server",
    });
  }

  const server_to_check_permissions_of = ctx.user_servers.find(
    (user_server) => user_server.id === server_id
  );
  if (!server_to_check_permissions_of) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of the server you are trying to create channel settings for",
    });
  }
  const permission_bitfield = new PermissionsBitField(
    BigInt(server_to_check_permissions_of.permissions)
  );
  if (!permission_bitfield.has("ManageGuild")) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: MISSING_PERMISSIONS_MESSAGE,
    });
  }
}

export function assertCanEditServers(ctx: Context, server_id: string | string[]) {
  if (Array.isArray(server_id)) {
    server_id.forEach((id) => assertCanEditServer(ctx, id));
  } else {
    assertCanEditServer(ctx, server_id);
  }
}
