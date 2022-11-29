import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { findOrCreate } from "../../utils/operations";
export const server_create_input = z.object({ name: z.string(), id: z.string() });

export const serverRouter = router({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.server.findMany();
  }),
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.server.findFirst({ where: { id: input } });
  }),
  create: publicProcedure.input(server_create_input).mutation(({ ctx, input }) => {
    return ctx.prisma.server.create({ data: input });
  }),
});

export async function findOrCreateServer(
  caller: ReturnType<typeof serverRouter["createCaller"]>,
  create_input: z.infer<typeof server_create_input>
) {
  return findOrCreate(
    () => caller.byId(create_input.id),
    () => caller.create(create_input)
  );
}
