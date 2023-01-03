import { DiscordAccount, getDefaultDiscordAccount } from "@answeroverflow/db";
import type { inferRouterInputs } from "@trpc/server";
import { z } from "zod";
import { upsert, upsertMany } from "~api/utils/operations";
import {
  protectedUserOnlyFetch,
  protectedUserOnlyMutation,
} from "~api/utils/protected-procedures/user-only";
import { authedProcedure, mergeRouters, router } from "../trpc";

const z_discord_account_create_input = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable().optional(),
});

const z_discord_account_mutable = z_discord_account_create_input
  .extend({})
  .omit({ id: true })
  .partial();

const z_discord_account_update_input = z.object({
  id: z.string(),
  update: z_discord_account_mutable,
});

export const z_discord_account_upser_input = z.object({
  create: z_discord_account_create_input,
  update: z_discord_account_update_input,
});

const account_find_router = router({
  byId: authedProcedure.input(z.string()).query(({ ctx, input }) => {
    return protectedUserOnlyFetch({
      fetch: () => ctx.prisma.discordAccount.findUnique({ where: { id: input } }),
      ctx,
      user_id: input,
      not_found_message: "Could not find discord account",
    });
  }),
  byIdMany: authedProcedure.input(z.array(z.string())).query(({ ctx, input }) => {
    return protectedUserOnlyFetch({
      fetch: () => ctx.prisma.discordAccount.findMany({ where: { id: { in: input } } }),
      ctx,
      user_id: input,
      not_found_message: "Could not find discord account",
    });
  }),
});

const account_crud_router = router({
  create: authedProcedure.input(z_discord_account_create_input).mutation(({ ctx, input }) => {
    return protectedUserOnlyMutation({
      ctx,
      user_id: input.id,
      operation: () => ctx.prisma.discordAccount.create({ data: input }),
    });
  }),
  createBulk: authedProcedure
    .input(z.array(z_discord_account_create_input))
    .mutation(async ({ ctx, input }) => {
      await protectedUserOnlyMutation({
        ctx,
        user_id: input.map((i) => i.id),
        operation: () => ctx.prisma.discordAccount.createMany({ data: input }),
      });
      return input.map((i) => getDefaultDiscordAccount(i));
    }),
  update: authedProcedure.input(z_discord_account_update_input).mutation(({ ctx, input }) => {
    return protectedUserOnlyMutation({
      ctx,
      user_id: input.id,
      operation: () =>
        ctx.prisma.discordAccount.update({ where: { id: input.id }, data: input.update }),
    });
  }),
  updateBulk: authedProcedure
    .input(z.array(z_discord_account_update_input))
    .mutation(({ ctx, input }) => {
      return protectedUserOnlyMutation({
        ctx,
        user_id: input.map((i) => i.id),
        operation: () =>
          ctx.prisma.$transaction(
            input.map((i) =>
              ctx.prisma.discordAccount.update({ where: { id: i.id }, data: i.update })
            )
          ),
      });
    }),
});

const account_upsert_router = router({
  upsert: authedProcedure.input(z_discord_account_upser_input).mutation(({ ctx, input }) => {
    return upsert(
      () => account_find_router.createCaller(ctx).byId(input.create.id),
      () => account_crud_router.createCaller(ctx).create(input.create),
      () => account_crud_router.createCaller(ctx).update(input.update)
    );
  }),
  upsertBulk: authedProcedure
    .input(z.array(z_discord_account_upser_input))
    .mutation(async ({ ctx, input }) => {
      return upsertMany({
        find: () => account_find_router.createCaller(ctx).byIdMany(input.map((i) => i.create.id)),
        create: (create) => account_crud_router.createCaller(ctx).createBulk(create),
        update: (update) => account_crud_router.createCaller(ctx).updateBulk(update),
        input,
        getFetchedDataId: (i) => i.id,
        getInputId: (i) => i.create.id,
      });
    }),
});

export const discordAccountRouter = mergeRouters(
  account_crud_router,
  account_find_router,
  account_upsert_router
);

export function makeDiscordAccountUpsert(
  account: DiscordAccount,
  update: z.infer<typeof z_discord_account_mutable>
): inferRouterInputs<typeof account_upsert_router>["upsert"] {
  return {
    create: account,
    update: {
      update: {
        ...update,
      },
      id: account.id,
    },
  };
}
