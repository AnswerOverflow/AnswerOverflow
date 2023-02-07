import { TRPCError } from "@trpc/server";
import { PermissionsBitField } from "discord.js";
import type { Source, Context } from "~api/router/context";

export const MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE =
  "You are missing the required permissions to do this";

type PermissionCheckResult = TRPCError | undefined;

export function isSuperUser(ctx: Context) {
  if (ctx.discord_account?.id === "523949187663134754") return true; // This is the ID of Rhys - TODO: Swap to an env var
  return false;
}

export function assertCanEditServer(ctx: Context, server_id: string): PermissionCheckResult {
  if (isSuperUser(ctx)) return;
  if (!ctx.user_servers) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "User servers missing, cannot verify if user has permission to edit server",
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
      message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
    });
  }
  return;
}

export function assertCanEditMessage(ctx: Context, author_id: string) {
  if (isSuperUser(ctx)) return;
  if (ctx.discord_account?.id !== author_id) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
    });
  }
  return;
}

export function assertIsUserInServer(ctx: Context, target_server_id: string) {
  if (isSuperUser(ctx)) return;
  if (!ctx.user_servers) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to view this server",
    });
  }
  const server = ctx.user_servers.find((server) => server.id === target_server_id);
  if (!server) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not a part of this server",
    });
  }
  return;
}

export function assertIsUser(ctx: Context, target_user_id: string) {
  if (isSuperUser(ctx)) return;
  if (ctx.discord_account?.id !== target_user_id) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to do this",
    });
  }
  return;
}
export const INVALID_ROUTE_FOR_BOT_ERROR = "This route is unavaliable to be called from the bot";
export const INVALID_ROUTER_FOR_WEB_CLIENT_ERROR =
  "This route is unavaliable to be called from the web client";

export function createInvalidSourceError(caller: Source) {
  let message = "";
  switch (caller) {
    case "discord-bot":
      message = INVALID_ROUTE_FOR_BOT_ERROR;
      break;
    case "web-client":
      message = INVALID_ROUTER_FOR_WEB_CLIENT_ERROR;
      break;
    default:
      throw new Error("Invalid source");
  }
  return new TRPCError({
    code: "BAD_REQUEST",
    message,
  });
}

export function isCtxCaller(ctx: Context, caller: Source) {
  if (ctx.caller !== caller) {
    return createInvalidSourceError(ctx.caller);
  }
  return;
}

export function isCtxSourceDiscordBot(ctx: Context) {
  return isCtxCaller(ctx, "discord-bot");
}

export function assertCanEditServerBotOnly(ctx: Context, server_id: string) {
  return [assertCanEditServer(ctx, server_id), isCtxSourceDiscordBot(ctx)];
}
