import { PrismaClient } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
function discordFetch(url: string, token: string) {
  return fetch("https://discordapp.com/api" + url, {
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

// TODO: This basic caching is fine for now but this should probably move to redis when going serverless
const user_servers_cache = new Map<string, ReturnType<typeof serverArrayShema.parse>>();
export async function getUserServers(access_token: string) {
  if (user_servers_cache.has(access_token)) {
    return user_servers_cache.get(access_token);
  }
  const data = await discordFetch("/users/@me/guilds", access_token);
  const servers = await serverArrayShema.parseAsync(await data.json());
  user_servers_cache.set(access_token, servers);
  return servers;
}

export async function getDiscordAccount(prisma: PrismaClient, user_id: string) {
  const user = await prisma.user.findUnique({
    where: {
      id: user_id,
    },
    include: {
      accounts: {
        where: {
          provider: "discord",
        },
      },
    },
  });
  if (!user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  const discord_account = user.accounts[0];
  if (!discord_account || !discord_account.access_token) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  return discord_account;
}
