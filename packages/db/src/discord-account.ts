import type { z } from "zod";
import { getDefaultDiscordAccount, prisma } from "@answeroverflow/prisma-types";
import {
  upsertIgnoredDiscordAccount,
  findIgnoredDiscordAccountById,
  findManyIgnoredDiscordAccountsById,
} from "./ignored-discord-account";
import { DBError } from "./utils/error";
import { upsertMany } from "./utils/operations";
import { zDiscordAccount } from "./zod-schemas";

export const zDiscordAccountRequired = zDiscordAccount.pick({
  id: true,
  name: true,
});

export const zDiscordAccountMutable = zDiscordAccount.extend({}).omit({ id: true }).partial();

export const zDiscordAccountCreate = zDiscordAccountMutable.merge(zDiscordAccountRequired);

export const zDiscordAccountUpdate = zDiscordAccountMutable.merge(
  zDiscordAccountRequired.pick({
    id: true,
  })
);

export const zDiscordAccountUpsert = zDiscordAccountCreate;

export function findDiscordAccountById(id: string) {
  return prisma.discordAccount.findUnique({
    where: { id },
  });
}

export function findManyDiscordAccountsById(ids: string[]) {
  return prisma.discordAccount.findMany({
    where: { id: { in: ids } },
  });
}

export async function createDiscordAccount(data: z.infer<typeof zDiscordAccountCreate>) {
  const deletedAccount = await findIgnoredDiscordAccountById(data.id);
  if (deletedAccount) throw new DBError("Account is ignored", "IGNORED_ACCOUNT");
  return prisma.discordAccount.create({
    data,
  });
}

export async function createManyDiscordAccounts(data: z.infer<typeof zDiscordAccountCreate>[]) {
  const ignoredAccounts = await findManyIgnoredDiscordAccountsById(data.map((i) => i.id));
  const ignoredIdsLookup = new Set(ignoredAccounts.map((i) => i.id));
  const allowedToCreateAccounts = data.filter((x) => !ignoredIdsLookup.has(x.id));
  await prisma.discordAccount.createMany({ data: allowedToCreateAccounts });
  return allowedToCreateAccounts.map((i) => getDefaultDiscordAccount(i));
}

export async function updateDiscordAccount(data: z.infer<typeof zDiscordAccountUpdate>) {
  return prisma.discordAccount.update({
    where: { id: data.id },
    data,
  });
}
export async function updateManyDiscordAccounts(data: z.infer<typeof zDiscordAccountUpdate>[]) {
  return prisma.$transaction(
    data.map((i) =>
      prisma.discordAccount.update({
        where: { id: i.id },
        data: i,
      })
    )
  );
}

export async function deleteDiscordAccount(id: string) {
  await prisma.discordAccount.delete({ where: { id } });
  await upsertIgnoredDiscordAccount(id);
  return true;
}

export async function upsertManyDiscordAccounts(data: z.infer<typeof zDiscordAccountUpsert>[]) {
  return upsertMany({
    find: () => findManyDiscordAccountsById(data.map((i) => i.id)),
    create: (createInput) => createManyDiscordAccounts(createInput),
    update: (updateInput) => updateManyDiscordAccounts(updateInput),
    getFetchedDataId: (i) => i.id,
    getInputId: (i) => i.id,
    input: data,
  });
}
