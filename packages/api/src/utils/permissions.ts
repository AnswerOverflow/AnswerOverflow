import { TRPCError } from "@trpc/server";
import { PermissionsBitField } from "discord.js";
import { findIgnoredDiscordAccountById } from "@answeroverflow/db";
import type { Source, Context } from "~api/router/context";

export const MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE =
  "You are missing the required permissions to do this";

type PermissionCheckResult = TRPCError | undefined;

export function isSuperUser(ctx: Context) {
  if (ctx.discordAccount?.id === "523949187663134754") return true; // This is the ID of Rhys - TODO: Swap to an env var
  return false;
}

export function assertCanEditServer(ctx: Context, serverId: string): PermissionCheckResult {
  if (isSuperUser(ctx)) return;
  if (!ctx.userServers) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "User servers missing, cannot verify if user has permission to edit server",
    });
  }

  const serverToCheckPermissionsOf = ctx.userServers.find(
    (userServer) => userServer.id === serverId
  );
  if (!serverToCheckPermissionsOf) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: "You are not a member of the server you are trying to create channel settings for",
    });
  }
  const permissionBitfield = new PermissionsBitField(
    BigInt(serverToCheckPermissionsOf.permissions)
  );
  if (!permissionBitfield.has("ManageGuild")) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
    });
  }
  return;
}

export function assertCanEditMessage(ctx: Context, authorId: string) {
  if (isSuperUser(ctx)) return;
  if (ctx.discordAccount?.id !== authorId) {
    return new TRPCError({
      code: "FORBIDDEN",
      message: MISSING_PERMISSIONS_TO_EDIT_SERVER_MESSAGE,
    });
  }
  return;
}

export function assertIsUserInServer(ctx: Context, targetServerId: string) {
  if (isSuperUser(ctx)) return;
  if (!ctx.userServers) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "Sign in to view this server",
    });
  }
  const server = ctx.userServers.find((server) => server.id === targetServerId);
  if (!server) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not a part of this server",
    });
  }
  return;
}

export async function assertIsNotIgnoredAccount(ctx: Context, targetUserId: string) {
  if (ctx.discordAccount?.id !== targetUserId) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to do this",
    });
  }
  const ignoredAccount = await findIgnoredDiscordAccountById(targetUserId);
  if (ignoredAccount) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Your account is currently being ignored",
    });
  }
  return;
}

export async function assertIsIgnoredAccount(ctx: Context, targetUserId: string) {
  if (ctx.discordAccount?.id !== targetUserId) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: "You are not authorized to do this",
    });
  }
  const ignoredAccount = await findIgnoredDiscordAccountById(targetUserId);
  if (!ignoredAccount) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "Your account is not currently being ignored",
    });
  }
  return;
}

export const NOT_AUTHORIZED_MESSAGE = "You are not authorized to do this";

export function assertIsUser(ctx: Context, targetUserId: string) {
  if (isSuperUser(ctx)) return;
  if (ctx.discordAccount?.id !== targetUserId) {
    return new TRPCError({
      code: "UNAUTHORIZED",
      message: NOT_AUTHORIZED_MESSAGE,
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

export function assertCanEditServerBotOnly(ctx: Context, serverId: string) {
  return [assertCanEditServer(ctx, serverId), isCtxSourceDiscordBot(ctx)];
}
