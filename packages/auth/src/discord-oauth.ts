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

const serverArrayShema = z.array(serverSchema);

const user_servers_cache = new Map<string, ReturnType<typeof serverArrayShema.parse>>();

export async function getUserServers(access_token: string) {
  if (user_servers_cache.has(access_token)) {
    return user_servers_cache.get(access_token);
  }
  const data = await discordFetch("/users/@me/guilds", access_token);
  const servers = serverArrayShema.parse(data.data);
  user_servers_cache.set(access_token, servers);
  return servers;
}

// https://discord.com/developers/docs/resources/user#user-object
export const z_user_schema = z.object({
  id: z.string(),
  username: z.string(),
  discriminator: z.string(),
  avatar: z.string().nullable(),
  bot: z.boolean().optional(),
  system: z.boolean().optional(),
  mfa_enabled: z.boolean().optional(),
  banner: z.string().nullable().optional(),
  accent_color: z.number().optional(),
  locale: z.string().optional(),
  verified: z.boolean().optional(),
  email: z.string().nullable().optional(),
  flags: z.number().optional(),
  premium_type: z.number().optional(),
  public_flags: z.number().optional(),
});

export async function getDiscordUser(access_token: string) {
  const data = await discordFetch("/users/@me", access_token);
  const parsed = z_user_schema.parse(data.data);
  return parsed;
}
