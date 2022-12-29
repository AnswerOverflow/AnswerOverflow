import { TRPCError } from "@trpc/server";
import { PermissionsBitField } from "discord.js";
import type { Context } from "~api/router/context";

export const MISSING_PERMISSIONS_MESSAGE = "You are missing the required permissions to do this";

export function isSuperUser(ctx: Context) {
  if (ctx.session && ctx.session.user.id === "AnswerOverflow") return true;
  if (ctx.session && ctx.session.user.id === "523949187663134754") return true; // This is the ID of Rhys - TODO: Swap to an env var
  return false;
}

export function assertCanEditServer(ctx: Context, server_id: string) {
  if (isSuperUser(ctx)) return;

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

export function assertCanEditMessage(ctx: Context, author_id: string) {
  if (isSuperUser(ctx)) return;
  if (ctx.session?.user.id !== author_id) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: MISSING_PERMISSIONS_MESSAGE,
    });
  }
}

export function assertCanEditMessages(ctx: Context, author_id: string | string[]) {
  if (Array.isArray(author_id)) {
    author_id.forEach((id) => assertCanEditMessage(ctx, id));
  } else {
    assertCanEditMessage(ctx, author_id);
  }
}
