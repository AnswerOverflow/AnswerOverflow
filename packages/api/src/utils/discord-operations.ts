import { findDiscordOauthById } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";

export async function getDiscordOauthThrowIfNotFound(userId: string) {
  const account = await findDiscordOauthById(userId);
  if (!account?.access_token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  return account;
}
