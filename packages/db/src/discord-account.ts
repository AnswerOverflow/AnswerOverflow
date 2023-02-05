import type { z } from "zod";
import { getDefaultDiscordAccount, PrismaClient } from "..";
import {
  upsertIgnoredDiscordAccount,
  findIgnoredDiscordAccountById,
  findManyIgnoredDiscordAccountsById,
} from "./ignored-discord-account";
import { upsertMany } from "./utils/operations";
import { z_discord_account } from "./zod-schemas";

export const z_discord_account_required = z_discord_account.pick({
  id: true,
  name: true,
});

export const z_discord_account_mutable = z_discord_account.extend({}).omit({ id: true }).partial();

export const z_discord_account_create = z_discord_account_mutable.merge(z_discord_account_required);

export const z_discord_account_update = z_discord_account_mutable.merge(
  z_discord_account_required.pick({
    id: true,
  })
);

export const z_discord_account_upsert = z_discord_account_create;

export function findDiscordAccountById(id: string, prisma: PrismaClient) {
  return prisma.discordAccount.findUnique({
    where: { id },
  });
}

export function findManyDiscordAccountsById(ids: string[], prisma: PrismaClient) {
  return prisma.discordAccount.findMany({
    where: { id: { in: ids } },
  });
}

export async function createDiscordAccount(
  data: z.infer<typeof z_discord_account_create>,
  prisma: PrismaClient
) {
  const deleted_account = await findIgnoredDiscordAccountById(data.id, prisma);
  if (deleted_account) throw new Error("Cannot create an account for a deleted user");
  return prisma.discordAccount.create({
    data,
  });
}

export async function createManyDiscordAccounts(
  data: z.infer<typeof z_discord_account_create>[],
  prisma: PrismaClient
) {
  const ignored_accounts = await findManyIgnoredDiscordAccountsById(
    data.map((i) => i.id),
    prisma
  );
  const ignored_ids_lookup = new Set(ignored_accounts.map((i) => i.id));
  const allowed_to_create_accounts = data.filter((x) => !ignored_ids_lookup.has(x.id));
  await prisma.discordAccount.createMany({ data: allowed_to_create_accounts });
  return allowed_to_create_accounts.map((i) => getDefaultDiscordAccount(i));
}

export async function updateDiscordAccount(
  data: z.infer<typeof z_discord_account_update>,
  prisma: PrismaClient
) {
  return prisma.discordAccount.update({
    where: { id: data.id },
    data,
  });
}
export async function updateManyDiscordAccounts(
  data: z.infer<typeof z_discord_account_update>[],
  prisma: PrismaClient
) {
  return prisma.$transaction(
    data.map((i) =>
      prisma.discordAccount.update({
        where: { id: i.id },
        data: i,
      })
    )
  );
}

export async function deleteDiscordAccount(id: string, prisma: PrismaClient) {
  await prisma.discordAccount.delete({ where: { id } });
  await upsertIgnoredDiscordAccount(id, prisma);
  return true;
}

export async function bulkUpsertDiscordAccounts(
  data: z.infer<typeof z_discord_account_upsert>[],
  prisma: PrismaClient
) {
  return upsertMany({
    create: () => createManyDiscordAccounts(data, prisma),
    update: () => updateManyDiscordAccounts(data, prisma),
    find: () =>
      findManyDiscordAccountsById(
        data.map((i) => i.id),
        prisma
      ),
    getFetchedDataId: (i) => i.id,
    getInputId: (i) => i.id,
    input: data,
  });
}
