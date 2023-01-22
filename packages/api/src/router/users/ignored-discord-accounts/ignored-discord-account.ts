import { z } from "zod";
import { router, publicProcedure } from "~api/router/trpc";
import { findAllowNull } from "~api/utils/operations";
import type { Context } from "~api/router/context";
import { TRPCError } from "@trpc/server";
import { protectedFetch, protectedMutation } from "~api/utils/protected-procedures";
import { assertIsUser, assertUserDoesNotExistInDB } from "~api/utils/permissions";

export const IGNORED_ACCOUNT_MESSAGE =
  "Cannot create discord account for ignored user. Enable indexing of your account first";

export async function assertIsNotDeletedUser(ctx: Context, target_user_id: string) {
  const deleted_account = await findAllowNull(() =>
    ignored_discord_account_router.createCaller(ctx).byId(target_user_id)
  );
  if (deleted_account) {
    return new TRPCError({
      code: "PRECONDITION_FAILED",
      message: IGNORED_ACCOUNT_MESSAGE,
    });
  }
  return;
}

export const ignored_discord_account_router = router({
  upsert: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input), () => assertUserDoesNotExistInDB(ctx, input)],
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
    return protectedFetch({
      permissions: () => assertIsUser(ctx, input),
      not_found_message: "Ignored discord account not found",
      fetch: () => ctx.prisma.ignoredDiscordAccount.findUnique({ where: { id: input } }),
    });
  }),
  byIdMany: publicProcedure.input(z.array(z.string())).query(({ ctx, input }) => {
    return protectedFetch({
      fetch: () =>
        ctx.prisma.ignoredDiscordAccount.findMany({
          where: {
            id: {
              in: input,
            },
          },
        }),
      permissions: () => input.map((id) => assertIsUser(ctx, id)),
      not_found_message: "Ignored discord accounts not found",
    });
  }),
  stopIgnoring: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input),
      operation: () => ctx.prisma.ignoredDiscordAccount.delete({ where: { id: input } }),
    });
  }),
});
