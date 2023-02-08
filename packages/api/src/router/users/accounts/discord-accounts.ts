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
import { MergeRouters, router, public_procedure } from "~api/router/trpc";
import {
  protectedFetchManyWithPublicData,
  protectedFetchWithPublicData,
  protectedMutation,
} from "~api/utils/protected-procedures";
import { assertIsUser } from "~api/utils/permissions";

const account_crud_router = router({
  byId: public_procedure.input(z.string()).query(({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findDiscordAccountById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      not_found_message: "Could not find discord account",
      publicDataFormatter: (data) => z_discord_account_public.parse(data),
    });
  }),
  byIdMany: public_procedure.input(z_unique_array).query(({ ctx, input }) => {
    return protectedFetchManyWithPublicData({
      fetch: () => findManyDiscordAccountsById(input),
      permissions: (data) => assertIsUser(ctx, data.id),
      publicDataFormatter: (data) => z_discord_account_public.parse(data),
    });
  }),
  create: public_procedure.input(z_discord_account_create).mutation(async ({ ctx, input }) => {
    return protectedMutation({
      permissions: [() => assertIsUser(ctx, input.id)],
      operation: () => createDiscordAccount(input),
    });
  }),
  update: public_procedure.input(z_discord_account_update).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input.id),
      operation: () => updateDiscordAccount(input),
    });
  }),
  delete: public_procedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedMutation({
      permissions: () => assertIsUser(ctx, input),
      operation: () => deleteDiscordAccount(input),
    });
  }),
});

const account_upsert_router = router({
  upsert: public_procedure.input(z_discord_account_upsert).mutation(({ ctx, input }) => {
    return upsert({
      find: () => findDiscordAccountById(input.id),
      create: () => account_crud_router.createCaller(ctx).create(input),
      update: () => account_crud_router.createCaller(ctx).update(input),
    });
  }),
});

export const discord_account_router = MergeRouters(account_crud_router, account_upsert_router);
