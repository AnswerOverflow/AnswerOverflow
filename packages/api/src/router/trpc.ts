import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from './context';
import superjson from 'superjson';
import { getDiscordUser, getUserServers } from '@answeroverflow/cache';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { findDiscordOauthByUserId } from '@answeroverflow/db';

export interface Meta {
	tenantAuthAccessible: boolean; // Whether this endpoint is accessible by tenant auth
}

const t = initTRPC
	.context<Context>()
	.meta<Meta>()
	.create({
		transformer: superjson,
		errorFormatter({ shape }) {
			return shape;
		},
		defaultMeta: {
			tenantAuthAccessible: false,
		},
	});

async function getDiscordOauth(ctx: Context) {
	if (!ctx.session) {
		return null;
	}
	const discordOauth = await findDiscordOauthByUserId(ctx.session.user.id);
	return discordOauth;
}

const addDiscordAccount = t.middleware(async ({ ctx, next }) => {
	if (ctx.caller === 'web-client' && ctx.session) {
		const discordOauth = await getDiscordOauth(ctx);
		if (discordOauth && discordOauth.access_token) {
			try {
				const discordAccount = await getDiscordUser({
					accessToken: discordOauth.access_token,
				});
				ctx.discordAccount = discordAccount;
			} catch (e) {
				console.error(e);
			}
		}
	}
	return next({
		ctx: {
			session: ctx.session,
		},
	});
});

export const getUserServersFromCtx = async (ctx: Context) => {
	const discordOauth = await getDiscordOauth(ctx);
	if (discordOauth && discordOauth.access_token) {
		const userServers = await getUserServers({
			accessToken: discordOauth.access_token,
		});
		ctx.userServers = userServers;
		return userServers;
	}

	return [];
};

const addUserServers = t.middleware(async ({ ctx, next }) => {
	// In a test environment, we manually populate it
	if (ctx.caller === 'web-client' && sharedEnvs.NODE_ENV !== 'test') {
		try {
			ctx.userServers = await getUserServersFromCtx(ctx);
		} catch (e) {
			console.error(e);
		}
	}
	if (!ctx.userServers) {
		ctx.userServers = []; // TODO: Maybe throw error here instead?
	}
	return next({
		ctx: {
			userServers: ctx.userServers,
		},
	});
});

const checkTenantAuth = t.middleware(async ({ ctx, next, meta }) => {
	const isTenantAuthAccessible = meta?.tenantAuthAccessible ?? false;
	if (ctx.session?.isTenantSession && !isTenantAuthAccessible) {
		throw new TRPCError({
			code: 'METHOD_NOT_SUPPORTED',
			message: 'This operation is not supported on tenant sites.',
		});
	}
	return next();
});

export const router = t.router;
export const MergeRouters = t.mergeRouters;
const procedureBase = t.procedure.use(checkTenantAuth);
export const publicProcedure = procedureBase;
export const withDiscordAccountProcedure = procedureBase.use(addDiscordAccount);
export const withUserServersProcedure = procedureBase
	.use(addDiscordAccount)
	.use(addUserServers);
