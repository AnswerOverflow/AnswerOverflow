import { z } from "zod";
import { publicProcedure, router } from "../../trpc";

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
