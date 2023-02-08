import { z } from "zod";
// get fetch from axios

import axios from "axios";

function discordFetch(url: string, token: string) {
  return axios.get("https://discordapp.com/api" + url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
}

const serverSchema = z.object({
  id: z.string(),
  name: z.string(),
  icon: z.string().nullable(),
  owner: z.boolean(),
  permissions: z.number(),
  features: z.array(z.string()),
});

const serverArraySchema = z.array(serverSchema);

const userServersCache = new Map<string, ReturnType<typeof serverArraySchema.parse>>();

export type DiscordServer = z.infer<typeof serverSchema>;

export async function getUserServers(accessToken: string) {
  if (userServersCache.has(accessToken)) {
    return userServersCache.get(accessToken);
  }
  const data = await discordFetch("/users/@me/guilds", accessToken);
  const servers = serverArraySchema.parse(data.data);
  userServersCache.set(accessToken, servers);
  return servers;
}

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

export async function getDiscordUser(accessToken: string) {
  const data = await discordFetch("/users/@me", accessToken);
  const parsed = zUserSchema.parse(data.data);
  return parsed;
}
