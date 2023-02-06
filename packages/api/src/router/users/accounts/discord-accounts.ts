import {
  z_unique_array,
  z_discord_account_public,
  findDiscordAccountById,
  z_discord_account_create,
  z_discord_account_update,
  z_discord_account_upsert,
  findManyDiscordAccountsById,
  createDiscordAccount,
  updateDiscordAccount,
  deleteDiscordAccount,
  upsert,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, router, publicProcedure } from "~api/router/trpc";
import {
  protectedFetchManyWithPublicData,
  protectedFetchWithPublicData,
  protectedMutation,
} from "~api/utils/protected-procedures";
import { assertIsUser } from "~api/utils/permissions";

const account_crud_router = router({
  byId: publicProcedure.input(z.string()).query(({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findDiscordAccountById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      not_found_message: "Could not find discord account",
      public_data_formatter: (data) => z_discord_account_public.parse(data),
    });
  }),
  byIdMany: publicProcedure.input(z_unique_array).query(({ ctx, input }) => {
    return protectedFetchManyWithPublicData({
      fetch: () => findManyDiscordAccountsById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      public_data_formatter: (data) => z_discord_account_public.parse(data),
    });
  }),
  create: publicProcedure.input(z_discord_account_create).mutation(async ({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input.id)],
      operation: () => createDiscordAccount(input),
    });
  }),
  update: publicProcedure.input(z_discord_account_update).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input.id),
      operation: () => updateDiscordAccount(input),
    });
  }),
  delete: publicProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input),
      operation: () => deleteDiscordAccount(input),
    });
  }),
});

const account_upsert_router = router({
  upsert: publicProcedure.input(z_discord_account_upsert).mutation(({ ctx, input }) => {
    return upsert({
      find: () => findDiscordAccountById(input.id),
      create: () => account_crud_router.createCaller(ctx).create(input),
      update: () => account_crud_router.createCaller(ctx).update(input),
    });
  }),
});

export const discordAccountRouter = mergeRouters(account_crud_router, account_upsert_router);
