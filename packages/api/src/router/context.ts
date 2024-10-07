import { Auth } from '@answeroverflow/core/auth';
import type { inferAsyncReturnType } from '@trpc/server';

/**
 * Replace this with an object if you want to pass things to createContextInner
 */

export const sourceTypes = ['web-client', 'discord-bot'] as const;
export type Source = (typeof sourceTypes)[number];

type CreateContextOptions = {
	session: Auth.Session | null;
	// If the web client, then we need to fetch the user servers
	source: Source;
	// Used for ensuring that the user has the right access to the data they are trying to fetch
	userServers?: Auth.DiscordAPIServerSchema[] | null;
	discordAccount?: Awaited<ReturnType<typeof Auth.getDiscordUser>> | null;
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
	};
};

export const createSSGContext = async () => {
	return await createContextInner({ source: 'web-client', session: null });
};

export type AppRouterCreate = Omit<CreateContextOptions, 'source'>;

export const createBotContext = async (opts: AppRouterCreate) => {
	return await createContextInner({ ...opts, source: 'discord-bot' });
};

/**
 * This is the actual context you'll use in your router
 * @link https://trpc.io/docs/context
 **/
export const createContext = async () => {
	const session = await Auth.getServerSession();

	return await createContextInner({
		session,
		userServers: null,
		source: 'web-client',
	});
};

export type Context = inferAsyncReturnType<typeof createContext>;
