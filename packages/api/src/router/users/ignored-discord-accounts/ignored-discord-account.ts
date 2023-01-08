import { z } from "zod";
import { protectedUserOnlyMutation } from "~api/utils/protected-procedures/user-only";
import { withDiscordAccountProcedure, router, publicProcedure } from "~api/router/trpc";
import { findOrThrowNotFound } from "~api/utils/operations";

export const ignored_discord_account_router = router({
  upsert: withDiscordAccountProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedUserOnlyMutation({
      ctx,
      user_id: input,
      operation: () =>
        ctx.prisma.ignoredDiscordAccount.upsert({
          where: { id: input },
          create: {
            id: input,
          },
          update: {
            id: input,
          },
        }),
    });
  }),
  // TODO: Make bot only?
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return findOrThrowNotFound(
      () => ctx.prisma.ignoredDiscordAccount.findUnique({ where: { id: input } }),
      "Ignored Discord account not found"
    );
  }),
});
