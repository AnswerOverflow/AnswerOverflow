import { Session, getServerSession } from "@answeroverflow/auth";
import type { getDiscordUser, getUserServers } from "@answeroverflow/auth/src/discord-oauth";
import { prisma, elastic } from "@answeroverflow/db";
import type { inferAsyncReturnType } from "@trpc/server";
import type { CreateNextContextOptions } from "@trpc/server/adapters/next";

/**
 * Replace this with an object if you want to pass things to createContextInner
 */

type CreateContextOptions = {
  session: Session | null;
  // If the web client, then we need to fetch the user servers
  caller: "discord-bot" | "web-client";
  // Used for ensuring that the user has the right access to the data they are trying to fetch
  user_servers?: Awaited<ReturnType<typeof getUserServers>> | null;
  discord_account?: Awaited<ReturnType<typeof getDiscordUser>> | null;
};

/** Use this helper for:
 *  - testing, where we dont have to Mock Next.js' req/res
 *  - trpc's `createSSGHelpers` where we don't have req/res
 * @see https://beta.create.t3.gg/en/usage/trpc#-servertrpccontextts
 */
// eslint-disable-next-line @typescript-eslint/require-await
export const createContextInner = async (opts: CreateContextOptions) => {
  return {
    session: opts.session,
    user_servers: opts.user_servers,
    caller: opts.caller,
    discord_account: opts.discord_account,
    prisma,
    elastic,
  };
};

export type BotContextCreate = Omit<CreateContextOptions, "caller">;

export const createBotContext = async (opts: BotContextCreate) => {
  return await createContextInner({ ...opts, caller: "discord-bot" });
};

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = async (opts: CreateNextContextOptions) => {
  const session = await getServerSession(opts);

  return await createContextInner({
    session,
    user_servers: null,
    caller: "web-client",
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;
