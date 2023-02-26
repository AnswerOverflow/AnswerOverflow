import { z } from "zod";
import axios from "axios";
import { redis } from "./client";

export function discordApiFetch(url: "/users/@me/guilds" | "/users/@me", token: string) {
  return axios.get("https://discordapp.com/api" + url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
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
export async function getUserServers(accessToken: string) {
  const client = await redis;
  const cachedServers = await client.get(getDiscordServersRedisKey(accessToken));
  if (cachedServers) {
    return zDiscordApiServerArraySchema.parse(JSON.parse(cachedServers));
  }
  const data = await discordApiFetch("/users/@me/guilds", accessToken);
  const servers = zDiscordApiServerArraySchema.parse(data.data);
  await client.setEx(
    getDiscordServersRedisKey(accessToken),
    hoursToSeconds(DISCORD_SERVERS_CACHE_TTL_IN_HOURS),
    JSON.stringify(servers)
  );
  return servers;
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

export async function getDiscordUser(accessToken: string) {
  const client = await redis;
  const cachedUser = await client.get(getDiscordUserRedisKey(accessToken));
  if (cachedUser) {
    return zUserSchema.parse(JSON.parse(cachedUser));
  }
  const data = await discordApiFetch("/users/@me", accessToken);
  const parsed = zUserSchema.parse(data.data);
  await client.setEx(
    getDiscordUserRedisKey(accessToken),
    hoursToSeconds(DISCORD_USER_CACHE_TTL_IN_HOURS),
    JSON.stringify(parsed)
  );
  return parsed;
}
