import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "~api/router/trpc";

export const user_create_input = z.object({ name: z.string(), id: z.string() });

const user_modify_router = router({
  create: publicProcedure.input(user_create_input).mutation(({ ctx, input }) => {
    return ctx.prisma.user.create({
      data: {
        ...input,
      },
    });
  }),
  update: publicProcedure
    .input(z.object({ name: z.string(), id: z.string() }))
    .mutation(({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: input.id },
        data: {
          name: input.name,
        },
      });
    }),
});

const user_find_router = router({
  all: publicProcedure.query(({ ctx }) => {
    return ctx.prisma.user.findMany();
  }),
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return ctx.prisma.user.findFirst({ where: { id: input } });
  }),
});

const user_upsert_router = router({
  upsert: publicProcedure.input(user_create_input).mutation(async ({ ctx, input }) => {
    const user_fetch = user_find_router.createCaller(ctx);
    const user_update_create = user_modify_router.createCaller(ctx);
    let existing_user = await user_fetch.byId(input.id);
    if (!existing_user) {
      existing_user = await user_update_create.create(input);
    }
    return user_update_create.update({ id: existing_user.id, name: input.name });
  }),
});

export const userRouter = mergeRouters(user_find_router, user_upsert_router);
