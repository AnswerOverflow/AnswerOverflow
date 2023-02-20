import type { z } from "zod";
import { getDefaultServerWithFlags, prisma, Server } from "@answeroverflow/prisma-types";
import { upsert } from "./utils/operations";
import { addFlagsToServer, zServer, mergeServerFlags } from "@answeroverflow/prisma-types";

export const zServerRequired = zServer.pick({
  id: true,
  name: true,
});

export const zServerMutable = zServer
  .omit({
    id: true,
  })
  .deepPartial();

export const zServerCreate = zServerMutable.merge(zServerRequired);

export const zServerUpdate = zServerMutable.merge(
  zServerRequired.pick({
    id: true,
  })
);

export const zServerUpsert = zServerCreate;

export function combineServerSettings<
  F extends { bitfield: number },
  T extends z.infer<typeof zServerMutable>
>({ old, updated }: { old: F; updated: T }) {
  const { flags, ...updateDataWithoutFlags } = updated;
  return {
    ...updateDataWithoutFlags,
    bitfield: flags ? mergeServerFlags(old.bitfield, flags) : undefined,
  };
}

export async function createServer(input: z.infer<typeof zServerCreate>) {
  const created = await prisma.server.create({
    data: combineServerSettings({
      old: getDefaultServerWithFlags(input),
      updated: input,
    }),
  });
  return addFlagsToServer(created);
}

export async function updateServer(input: z.infer<typeof zServerUpdate>, existing: Server) {
  const updated = await prisma.server.update({
    where: { id: input.id },
    data: combineServerSettings({
      old: existing,
      updated: input,
    }),
  });
  return addFlagsToServer(updated);
}

export async function findServerById(id: string) {
  const found = await prisma.server.findUnique({ where: { id } });
  if (!found) return null;
  return addFlagsToServer(found);
}

export function upsertServer(input: z.infer<typeof zServerUpsert>) {
  return upsert({
    find: () => findServerById(input.id),
    create: () => createServer(input),
    update: (old) => updateServer(input, old),
  });
}
