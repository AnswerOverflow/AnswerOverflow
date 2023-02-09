import { z } from "zod";
import { router, publicProcedure } from "~api/router/trpc";
import { protectedFetch, protectedMutation } from "~api/utils/protected-procedures";
import { assertIsUser } from "~api/utils/permissions";
import {
  deleteIgnoredDiscordAccount,
  findIgnoredDiscordAccountById,
  upsertIgnoredDiscordAccount,
} from "@answeroverflow/db/src/ignored-discord-account";

export const IGNORED_ACCOUNT_MESSAGE =
  "Cannot create discord account for ignored user. Enable indexing of your account first";

export const ignoredDiscordAccountRouter = router({
  upsert: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input)],
      operation: () => upsertIgnoredDiscordAccount(input),
    });
  }),
  // TODO: Make bot only?
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return protectedFetch({
      permissions: () => assertIsUser(ctx, input),
      notFoundMessage: "Ignored discord account not found",
      fetch: () => findIgnoredDiscordAccountById(input),
    });
  }),
  stopIgnoring: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input),
      operation: () => deleteIgnoredDiscordAccount(input),
    });
  }),
});
