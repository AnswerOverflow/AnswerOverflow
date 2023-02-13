import {
  zUniqueArray,
  zDiscordAccountPublic,
  findDiscordAccountById,
  zDiscordAccountCreate,
  zDiscordAccountUpdate,
  zDiscordAccountUpsert,
  findManyDiscordAccountsById,
  createDiscordAccount,
  updateDiscordAccount,
  deleteDiscordAccount,
  upsert,
} from "@answeroverflow/db";
import { z } from "zod";
import { MergeRouters, router, publicProcedure } from "~api/router/trpc";
import {
  protectedFetchManyWithPublicData,
  protectedFetchWithPublicData,
  protectedMutation,
} from "~api/utils/protected-procedures";
import { assertIsNotIgnoredAccount, assertIsUser } from "~api/utils/permissions";

const accountCrudRouter = router({
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findDiscordAccountById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      notFoundMessage: "Could not find discord account",
      publicDataFormatter: (data) => zDiscordAccountPublic.parse(data),
    });
  }),
  byIdMany: publicProcedure.input(zUniqueArray).query(({ ctx, input }) => {
    return protectedFetchManyWithPublicData({
      fetch: () => findManyDiscordAccountsById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      publicDataFormatter: (data) => zDiscordAccountPublic.parse(data),
    });
  }),
  create: publicProcedure.input(zDiscordAccountCreate).mutation(async ({ ctx, input }) => {
    return protectedMutation({
      permissions: [
        () => assertIsUser(ctx, input.id),
        () => assertIsNotIgnoredAccount(ctx, input.id),
      ],
      operation: () => createDiscordAccount(input),
    });
  }),
  update: publicProcedure.input(zDiscordAccountUpdate).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input.id),
      operation: () => updateDiscordAccount(input),
    });
  }),
  delete: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input), () => assertIsNotIgnoredAccount(ctx, input)],
      operation: () => deleteDiscordAccount(input),
    });
  }),
});

const accountUpsertRouter = router({
  upsert: publicProcedure.input(zDiscordAccountUpsert).mutation(({ ctx, input }) => {
    return upsert({
      find: () => findDiscordAccountById(input.id),
      create: () => accountCrudRouter.createCaller(ctx).create(input),
      update: () => accountCrudRouter.createCaller(ctx).update(input),
    });
  }),
});

export const discordAccountRouter = MergeRouters(accountCrudRouter, accountUpsertRouter);
