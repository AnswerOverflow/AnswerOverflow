import {
  zUniqueArray,
  zDiscordAccountPublic,
  findDiscordAccountById,
  findManyDiscordAccountsById,
  deleteDiscordAccount,
  deleteIgnoredDiscordAccount,
  findIgnoredDiscordAccountById,
} from "@answeroverflow/db";
import { z } from "zod";
import { MergeRouters, router, withDiscordAccountProcedure } from "~api/router/trpc";
import {
  protectedFetch,
  protectedFetchManyWithPublicData,
  protectedFetchWithPublicData,
  protectedMutation,
} from "~api/utils/protected-procedures";
import { assertIsNotIgnoredAccount, assertIsUser } from "~api/utils/permissions";

const accountCrudRouter = router({
  byId: withDiscordAccountProcedure.input(z.string()).query(({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findDiscordAccountById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      notFoundMessage: "Could not find discord account",
      publicDataFormatter: (data) => zDiscordAccountPublic.parse(data),
    });
  }),
  byIdMany: withDiscordAccountProcedure.input(zUniqueArray).query(({ ctx, input }) => {
    return protectedFetchManyWithPublicData({
      fetch: () => findManyDiscordAccountsById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      publicDataFormatter: (data) => zDiscordAccountPublic.parse(data),
    });
  }),
  delete: withDiscordAccountProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input), () => assertIsNotIgnoredAccount(ctx, input)],
      operation: () => deleteDiscordAccount(input),
    });
  }),
  unDelete: withDiscordAccountProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input), () => assertIsNotIgnoredAccount(ctx, input)],
      operation: () => deleteIgnoredDiscordAccount(input),
    });
  }),
  checkIfIgnored: withDiscordAccountProcedure.input(z.string()).query(({ ctx, input }) => {
    return protectedFetch({
      permissions: () => assertIsUser(ctx, input),
      fetch: () => findIgnoredDiscordAccountById(input),
      notFoundMessage: "Could not find discord account",
    });
  }),
});

export const discordAccountRouter = MergeRouters(accountCrudRouter);
