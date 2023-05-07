import { z } from 'zod';
import axios from 'axios';
import { getRedisClient } from './client';

type DiscordApiCallOpts = {
	accessToken: string;
	onInvalidToken: () => void | Promise<void>;
};
export async function discordApiFetch(
	url: '/users/@me/guilds' | '/users/@me',
	callOpts: DiscordApiCallOpts,
) {
	const data = await axios.get('https://discordapp.com/api' + url, {
		headers: {
			Authorization: `Bearer ${callOpts.accessToken}`,
		},
		validateStatus(status) {
			return status < 300 || status === 401;
		},
	});
	if (data.status === 401) {
		await callOpts.onInvalidToken();
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
	const servers = zDiscordApiServerArraySchema.parse(data.data);
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
	const parsed = zUserSchema.parse(data.data);
	await updateCachedDiscordUser(opts.accessToken, parsed);
	return parsed;
}
