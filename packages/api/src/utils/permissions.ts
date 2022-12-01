import { TRPCError } from "@trpc/server";
import { PermissionsBitField } from "discord.js";
import { Context } from "../context";

export function assertCanEditServer(ctx: Context, server_id: string) {
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
      message: "You do not have permission to edit this server",
    });
  }
}
