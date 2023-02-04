import type { z } from "zod";
import type { PrismaClient } from "@answeroverflow/prisma-types";
import { upsert } from "./utils/operations";
import { z_server } from "./zod-schemas";
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

export function createServer(input: z.infer<typeof z_server_create>, prisma: PrismaClient) {
  return prisma.server.create({ data: input });
}

export function updateServer(input: z.infer<typeof z_server_update>, prisma: PrismaClient) {
  return prisma.server.update({ where: { id: input.id }, data: input });
}

export function findServerById(id: string, prisma: PrismaClient) {
  return prisma.server.findUnique({ where: { id } });
}

export function upsertServer(input: z.infer<typeof z_server_upsert>, prisma: PrismaClient) {
  return upsert({
    create: () => createServer(input, prisma),
    update: () => updateServer(input, prisma),
    find: () => findServerById(input.id, prisma),
  });
}
