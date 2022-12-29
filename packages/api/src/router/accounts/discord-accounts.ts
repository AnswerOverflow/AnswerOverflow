import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "../trpc";

const z_account_create_input = z.object({
  providerAccountId: z.string(),
  providerAccountName: z.string(),
  refresh_token: z.string().optional(),
  access_token: z.string().optional(),
  expires_at: z.number().optional(),
  token_type: z.string().optional(),
  scope: z.string().optional(),
  id_token: z.string().optional(),
  session_state: z.string().optional(),
});

const account_crud_router = router({
  create: publicProcedure.input(z_account_create_input).mutation(({ ctx, input }) => {
    return ctx.prisma.account.create({
      data: {
        ...input,
        provider: "discord",
        type: "oauth",
      },
    });
  }),
});

export const discordAccountRouter = mergeRouters(account_crud_router);
