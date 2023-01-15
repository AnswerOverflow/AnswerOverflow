import { TRPCError } from "@trpc/server";
import { PermissionsBitField } from "discord.js";
import type { Context } from "~api/router/context";

export const MISSING_PERMISSIONS_MESSAGE = "You are missing the required permissions to do this";

export function isAnswerOverflowBot(ctx: Context) {
  const bot_id =
    process.env.NODE_ENV === "test"
      ? process.env.VITE_DISCORD_CLIENT_ID
      : process.env.DISCORD_CLIENT_ID;
  if (ctx.discord_account?.id === bot_id) return true;
  return false;
}

export function isSuperUser(ctx: Context) {
  if (ctx.discord_account?.id === "523949187663134754") return true; // This is the ID of Rhys - TODO: Swap to an env var
  return false;
}

export function assertIsBot(ctx: Context) {
  if (isSuperUser(ctx)) return;
  if (isAnswerOverflowBot(ctx)) return;
  return new TRPCError({
    code: "UNAUTHORIZED",
    message: "You are not authorized to do this",
  });
}

export function assertCanEditServer(ctx: Context, server_id: string) {
  if (isSuperUser(ctx)) return;
  if (isAnswerOverflowBot(ctx)) return;
  if (!ctx.user_servers) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to edit this server",
    });
  }

  const server_to_check_permissions_of = ctx.user_servers.find(
    (user_server) => user_server.id === server_id
  );
  if (!server_to_check_permissions_of) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of the server you are trying to create channel settings for",
    });
  }
  const permission_bitfield = new PermissionsBitField(
    BigInt(server_to_check_permissions_of.permissions)
  );
  if (!permission_bitfield.has("ManageGuild")) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: MISSING_PERMISSIONS_MESSAGE,
    });
  }
  return;
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
  if (isAnswerOverflowBot(ctx)) return;
  if (ctx.discord_account?.id !== author_id) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: MISSING_PERMISSIONS_MESSAGE,
    });
  }
  return;
}

export function assertCanEditMessages(ctx: Context, author_id: string | string[]) {
  if (Array.isArray(author_id)) {
    author_id.forEach((id) => assertCanEditMessage(ctx, id));
  } else {
    assertCanEditMessage(ctx, author_id);
  }
}

export function assertIsUser(ctx: Context, target_user_id: string) {
  if (isSuperUser(ctx)) return;
  if (isAnswerOverflowBot(ctx)) return;
  if (ctx.discord_account?.id !== target_user_id) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to do this",
    });
  }
  return;
}

export function assertIsUsers(ctx: Context, target_user_id: string[]) {
  if (Array.isArray(target_user_id)) {
    target_user_id.forEach((id) => assertIsUser(ctx, id));
  }
}
