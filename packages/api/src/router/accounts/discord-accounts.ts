import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "../trpc";

const z_discord_account_create_input = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
});

const account_crud_router = router({
  create: publicProcedure.input(z_discord_account_create_input).mutation(({ ctx, input }) => {
    return ctx.prisma.discordAccount.create({
      data: input,
    });
  }),
});

export const discordAccountRouter = mergeRouters(account_crud_router);
