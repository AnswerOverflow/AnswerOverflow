import type { z } from "zod";
import { getDefaultServer, prisma, Server } from "@answeroverflow/prisma-types";
import { upsert } from "./utils/operations";
import { addFlagsToServer, z_server, mergeServerFlags } from "./zod-schemas";

export const z_server_required = z_server.pick({
  id: true,
  name: true,
});

export const z_server_mutable = z_server
  .omit({
    id: true,
  })
  .partial();

export const z_server_create = z_server_mutable.merge(z_server_required);

export const z_server_update = z_server_mutable.merge(
  z_server_required.pick({
    id: true,
  })
);

export const z_server_upsert = z_server_create;

export function combineServerSettings<
  F extends { bitfield: number },
  T extends z.infer<typeof z_server_mutable>
>({ old, updated }: { old: F; updated: T }) {
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags ? mergeServerFlags(old.bitfield, flags) : undefined,
  };
}

export function getDefaultServerWithFlags(
  override: Partial<z.infer<typeof z_server>> & Pick<z.infer<typeof z_server>, "id" | "name">
) {
  return addFlagsToServer(getDefaultServer(override));
}

export async function createServer(input: z.infer<typeof z_server_create>) {
  const created = await prisma.server.create({
    data: combineServerSettings({
      old: getDefaultServerWithFlags(input),
      updated: input,
    }),
  });
  return addFlagsToServer(created);
}

export async function updateServer(input: z.infer<typeof z_server_update>, existing: Server) {
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

export function upsertServer(input: z.infer<typeof z_server_upsert>) {
  return upsert({
    find: () => findServerById(input.id),
    create: () => createServer(input),
    update: (old) => updateServer(input, old),
  });
}
