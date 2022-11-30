import { z } from "zod";
import { publicProcedure, router } from "../trpc";
import { findOrCreate } from "../utils/operations";

export const user_create_input = z.object({ name: z.string(), id: z.string() });

export const userRouter = router({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findMany();
  }),
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.user.findFirst({ where: { id: input } });
  }),
  create: publicProcedure.input(user_create_input).mutation(({ ctx, input }) => {
    return ctx.prisma.user.create({ data: input });
  }),
});

export function findOrCreateUser(
  caller: ReturnType<typeof userRouter["createCaller"]>,
  create_input: z.infer<typeof user_create_input>
) {
  return findOrCreate(
    () => caller.byId(create_input.id),
    () => caller.create(create_input)
  );
}
