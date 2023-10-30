import { z } from 'zod';
import { getRedisClient } from './client';
import { db } from '@answeroverflow/db';
import { sharedEnvs } from '@answeroverflow/env/shared';
import { and, eq } from 'drizzle-orm';
import { Account, dbAccounts, dbSessions } from '@answeroverflow/db/src/schema';
import { updateProviderAuthToken } from '@answeroverflow/db/src/auth';

type DiscordApiCallOpts = {
	accessToken: string;
};
export async function discordApiFetch(
	url: '/users/@me/guilds' | '/users/@me',
	callOpts: DiscordApiCallOpts,
) {
	const data = await fetch('https://discordapp.com/api' + url, {
		headers: {
			Authorization: `Bearer ${callOpts.accessToken}`,
		},
		// @ts-ignore
		cache: 'no-cache',
	});
	if (data.status === 401) {
		const account = await db.query.dbAccounts.findFirst({
			where: and(
				eq(dbAccounts.provider, 'discord'),
				eq(dbAccounts.access_token, callOpts.accessToken),
			),
		});
		if (!account) {
			throw new Error('Invalid access token');
		}
		await refreshAccessToken(account);
	}
	return data;
}
const hoursToSeconds = (hours: number) => hours * 60 * 60;

/*
 * Discord Servers
 */
export const zDiscordApiServerSchema = z.object({
	id: z.string(),
	name: z.string(),
	icon: z.string().nullable(),
	owner: z.boolean(),
	permissions: z.number(),
	features: z.array(z.string()),
});
export const zDiscordApiServerArraySchema = z.array(zDiscordApiServerSchema);
export type DiscordAPIServerSchema = z.infer<typeof zDiscordApiServerSchema>;

// TODO: Log cache hits and misses
const DISCORD_SERVERS_CACHE_TTL_IN_HOURS = 24;
export function getDiscordServersRedisKey(accessToken: string) {
	return `userServers:${accessToken}`;
}
export async function updateUserServersCache(
	accessToken: string,
	servers: DiscordAPIServerSchema[],
) {
	const client = await getRedisClient();
	await client.setEx(
		getDiscordServersRedisKey(accessToken),
		hoursToSeconds(DISCORD_SERVERS_CACHE_TTL_IN_HOURS),
		JSON.stringify(servers),
	);
}

export async function getUserServers(opts: DiscordApiCallOpts) {
	const client = await getRedisClient();
	const cachedServers = await client.get(
		getDiscordServersRedisKey(opts.accessToken),
	);
	if (cachedServers) {
		return zDiscordApiServerArraySchema.parse(JSON.parse(cachedServers));
	}
	const data = await discordApiFetch('/users/@me/guilds', opts);
	const servers = zDiscordApiServerArraySchema.parse(await data.json());
	await updateUserServersCache(opts.accessToken, servers);
	return servers;
}

export async function removeServerFromUserCache(
	opts: DiscordApiCallOpts & { serverId: string },
) {
	const cachedServers = await getUserServers(opts);
	if (cachedServers) {
		const filteredServers = cachedServers.filter(
			(server) => server.id !== opts.serverId,
		);
		await updateUserServersCache(opts.accessToken, filteredServers);
	}
}

export async function addServerToUserServerCache(
	opts: DiscordApiCallOpts & { server: DiscordAPIServerSchema },
) {
	const cachedServers = await getUserServers(opts);
	if (cachedServers) {
		await updateUserServersCache(opts.accessToken, [
			...cachedServers,
			opts.server,
		]);
	}
}

/*
 * Discord User
 */

// https://discord.com/developers/docs/resources/user#user-object
export const zUserSchema = z.object({
	id: z.string(),
	username: z.string(),
	discriminator: z.string(),
	avatar: z.string().nullable(),
	bot: z.boolean().optional(),
	system: z.boolean().optional(),
	mfaEnabled: z.boolean().optional(),
	banner: z.string().nullable().optional(),
	accentColor: z.number().optional(),
	locale: z.string().optional(),
	verified: z.boolean().optional(),
	email: z.string().nullable().optional(),
	flags: z.number().optional(),
	premiumType: z.number().optional(),
	publicFlags: z.number().optional(),
});

export type DiscordAPIUserSchema = z.infer<typeof zUserSchema>;

const DISCORD_USER_CACHE_TTL_IN_HOURS = 24;

export function getDiscordUserRedisKey(accessToken: string) {
	return `discordUser:${accessToken}`;
}

export async function updateCachedDiscordUser(
	accessToken: string,
	user: DiscordAPIUserSchema,
) {
	const client = await getRedisClient();
	await client.setEx(
		getDiscordUserRedisKey(accessToken),
		hoursToSeconds(DISCORD_USER_CACHE_TTL_IN_HOURS),
		JSON.stringify(user),
	);
	return user;
}

export async function getDiscordUser(opts: DiscordApiCallOpts) {
	const client = await getRedisClient();
	const cachedUser = await client.get(getDiscordUserRedisKey(opts.accessToken));
	if (cachedUser) {
		return zUserSchema.parse(JSON.parse(cachedUser));
	}
	const data = await discordApiFetch('/users/@me', opts);
	const parsed = zUserSchema.parse(await data.json());
	await updateCachedDiscordUser(opts.accessToken, parsed);
	return parsed;
}

export async function isRefreshTokenBeingUsed(
	refreshToken: string,
): Promise<boolean> {
	// wait between .1 and .3 seconds incase two requests come in at the same time
	await new Promise((resolve) =>
		setTimeout(resolve, Math.random() * 200 + 100),
	);
	const client = await getRedisClient();
	const cachedToken = await client.get(`refreshToken:${refreshToken}`);
	return !!cachedToken;
}

export async function setRefreshTokenBeingUsed(
	refreshToken: string,
	isBeingUsed: boolean,
): Promise<void> {
	const client = await getRedisClient();
	if (isBeingUsed) {
		await client.setEx(`refreshToken:${refreshToken}`, 5, 'true');
		return;
	} else {
		await client.del(`refreshToken:${refreshToken}`);
		return;
	}
}

export async function refreshAccessToken(discord: Account) {
	if (!discord.refresh_token) {
		throw new Error('No refresh token');
	}
	const params = new URLSearchParams();
	params.append('client_id', sharedEnvs.DISCORD_CLIENT_ID);
	params.append('client_secret', sharedEnvs.DISCORD_CLIENT_SECRET);
	params.append('grant_type', 'refresh_token');
	params.append('refresh_token', discord.refresh_token ?? '');
	try {
		console.log('Fetching new token');
		const inUse = await isRefreshTokenBeingUsed(discord.refresh_token);
		if (inUse) {
			console.log('Token is being used');
			return;
		}
		await setRefreshTokenBeingUsed(discord.refresh_token, true);
		const body = {
			client_id: sharedEnvs.DISCORD_CLIENT_ID,
			client_secret: sharedEnvs.DISCORD_CLIENT_SECRET,
			grant_type: 'refresh_token',
			refresh_token: discord.refresh_token ?? '',
		};
		const res = await fetch('https://discord.com/api/v10/oauth2/token', {
			method: 'POST',
			body: JSON.stringify(body),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
			},
		});

		const zAccessTokenResponse = z.object({
			token_type: z.string(),
			access_token: z.string(),
			expires_in: z.number(),
			refresh_token: z.string(),
			scope: z.string(),
		});
		const accessTokenResponse = zAccessTokenResponse.parse(await res.json());
		console.log('Updating token');
		await updateProviderAuthToken({
			provider: 'discord',
			providerAccountId: discord.providerAccountId,
			access_token: accessTokenResponse.access_token,
			expires_at:
				Math.floor(Date.now() / 1000) + accessTokenResponse.expires_in,
			refresh_token: accessTokenResponse.refresh_token,
			scope: accessTokenResponse.scope,
			token_type: accessTokenResponse.token_type,
		});
		await setRefreshTokenBeingUsed(discord.refresh_token, false);
	} catch (error) {
		await setRefreshTokenBeingUsed(discord.refresh_token, false);
		// We're in a bad state so just prompt a re-auth
		await db.delete(dbSessions).where(eq(dbSessions.userId, discord.userId));
	}
}
