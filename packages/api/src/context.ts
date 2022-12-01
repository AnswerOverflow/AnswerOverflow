import { Session, getServerSession } from "@answeroverflow/auth";
import { prisma } from "@answeroverflow/db";
import { type inferAsyncReturnType } from "@trpc/server";
import { type CreateNextContextOptions } from "@trpc/server/adapters/next";

/**
 * Replace this with an object if you want to pass things to createContextInner
 */

type UserGuild = {
  id: string;
  name: string;
  icon?: string | null;
  owner?: boolean;
  permissions: string;
  features: string[];
};

type CreateContextOptions = {
  session: Session | null;
  user_servers: UserGuild[] | null;
};

export type CreateBotContextOptions = CreateContextOptions;

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
    prisma,
  };
};

export const createBotContext = async (opts: CreateContextOptions) => {
  return await createContextInner(opts);
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
  });
};

export type Context = inferAsyncReturnType<typeof createContext>;
