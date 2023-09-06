import { type Session, getServerSession } from '@answeroverflow/auth';
import type {
	DiscordAPIServerSchema,
	getDiscordUser,
} from '@answeroverflow/cache';
import { elastic } from '@answeroverflow/db';
import type { inferAsyncReturnType } from '@trpc/server';
import type { CreateNextContextOptions } from '@trpc/server/adapters/next';

/**
 * Replace this with an object if you want to pass things to createContextInner
 */

export const sourceTypes = ['web-client', 'discord-bot'] as const;
export type Source = (typeof sourceTypes)[number];

type CreateContextOptions = {
	session: Session | null;
	// If the web client, then we need to fetch the user servers
	source: Source;
	// Used for ensuring that the user has the right access to the data they are trying to fetch
	userServers?: DiscordAPIServerSchema[] | null;
	discordAccount?: Awaited<ReturnType<typeof getDiscordUser>> | null;
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
		userServers: opts.userServers,
		caller: opts.source,
		discordAccount: opts.discordAccount,
		prisma,
		elastic,
	};
};

export const createSSGContext = async () => {
	return await createContextInner({ source: 'web-client', session: null });
};

export type BotContextCreate = Omit<CreateContextOptions, 'source'>;

export const createBotContext = async (opts: BotContextCreate) => {
	return await createContextInner({ ...opts, source: 'discord-bot' });
};

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = async (opts: CreateNextContextOptions) => {
	const session = await getServerSession(opts);

	return await createContextInner({
		session,
		userServers: null,
		source: 'web-client',
	});
};

export type Context = inferAsyncReturnType<typeof createContext>;
