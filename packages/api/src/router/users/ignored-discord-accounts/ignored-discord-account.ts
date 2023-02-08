import { z } from "zod";
import { router, public_procedure } from "~api/router/trpc";
import { protectedFetch, protectedMutation } from "~api/utils/protected-procedures";
import { assertIsUser } from "~api/utils/permissions";
import {
  deleteIgnoredDiscordAccount,
  findIgnoredDiscordAccountById,
  upsertIgnoredDiscordAccount,
} from "@answeroverflow/db/src/ignored-discord-account";

export const IGNORED_ACCOUNT_MESSAGE =
  "Cannot create discord account for ignored user. Enable indexing of your account first";

export const ignored_discord_account_router = router({
  upsert: public_procedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input)],
      operation: () => upsertIgnoredDiscordAccount(input),
    });
  }),
  // TODO: Make bot only?
  byId: public_procedure.input(z.string()).query(({ ctx, input }) => {
    return protectedFetch({
      permissions: () => assertIsUser(ctx, input),
      not_found_message: "Ignored discord account not found",
      fetch: () => findIgnoredDiscordAccountById(input),
    });
  }),
  stopIgnoring: public_procedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input),
      operation: () => deleteIgnoredDiscordAccount(input),
    });
  }),
});
