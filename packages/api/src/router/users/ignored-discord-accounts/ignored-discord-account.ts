import { z } from "zod";
import { router, publicProcedure } from "~api/router/trpc";
import { findAllowNull, findOrThrowNotFound } from "~api/utils/operations";
import type { Context } from "~api/router/context";
import { TRPCError } from "@trpc/server";
import { protectedMutation } from "~api/utils/protected-procedures";
import { assertIsUser } from "~api/utils/permissions";

export async function assertIsNotDeletedUser(ctx: Context, target_user_id: string) {
  const deleted_account = await findAllowNull(() =>
    ignored_discord_account_router.createCaller(ctx).byId(target_user_id)
  );
  if (deleted_account) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message:
        "Cannot create discord account for ignored user. Enable indexing of your account first",
    });
  }
  return;
}

export const ignored_discord_account_router = router({
  upsert: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input),
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
  byIdMany: publicProcedure.input(z.array(z.string())).query(({ ctx, input }) => {
    return ctx.prisma.ignoredDiscordAccount.findMany({
      where: {
        id: {
          in: input,
        },
      },
    });
  }),
  stopIgnoring: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input),
      operation: () => ctx.prisma.ignoredDiscordAccount.delete({ where: { id: input } }),
    });
  }),
});
