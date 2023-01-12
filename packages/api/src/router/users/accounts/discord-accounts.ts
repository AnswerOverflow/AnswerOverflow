import { getDefaultDiscordAccount, Prisma } from "@answeroverflow/db";
import { z } from "zod";
import { upsert, upsertMany } from "~api/utils/operations";
import {
  protectedUserOnlyFetch,
  protectedUserOnlyMutation,
} from "~api/utils/protected-procedures/user-only";
import { withDiscordAccountProcedure, mergeRouters, router } from "~api/router/trpc";
import { ignored_discord_account_router } from "../ignored-discord-accounts/ignored-discord-account";
import { TRPCError } from "@trpc/server";
import { assertIsNotDeletedUser } from "~api/router/users/ignored-discord-accounts/ignored-discord-account";

const z_discord_account = z.object({
  id: z.string(),
  name: z.string(),
  avatar: z.string().nullable(),
});

const z_discord_account_required = z_discord_account.pick({
  id: true,
  name: true,
});

const z_discord_account_mutable = z_discord_account.extend({}).omit({ id: true }).partial();

const z_discord_account_create = z_discord_account_mutable.merge(z_discord_account_required);

const z_discord_account_update = z_discord_account_mutable.merge(
  z_discord_account_required.pick({
    id: true,
  })
);

export const z_discord_account_upsert = z_discord_account_create;

const account_find_router = router({
  byId: withDiscordAccountProcedure.input(z.string()).query(({ ctx, input }) => {
    return protectedUserOnlyFetch({
      fetch: () => ctx.prisma.discordAccount.findUnique({ where: { id: input } }),
      ctx,
      user_id: input,
      not_found_message: "Could not find discord account",
    });
  }),
  byIdMany: withDiscordAccountProcedure.input(z.array(z.string())).query(({ ctx, input }) => {
    return protectedUserOnlyFetch({
      fetch: () => ctx.prisma.discordAccount.findMany({ where: { id: { in: input } } }),
      ctx,
      user_id: input,
      not_found_message: "Could not find discord account",
    });
  }),
});

const account_crud_router = router({
  create: withDiscordAccountProcedure
    .input(z_discord_account_create)
    .mutation(async ({ ctx, input }) => {
      await assertIsNotDeletedUser(ctx, input.id);
      return protectedUserOnlyMutation({
        ctx,
        user_id: input.id,
        async operation() {
          return ctx.prisma.discordAccount.create({ data: input });
        },
      });
    }),
  createBulk: withDiscordAccountProcedure
    .input(z.array(z_discord_account_create))
    .mutation(async ({ ctx, input }) => {
      const ignored_accounts = await ignored_discord_account_router
        .createCaller(ctx)
        .byIdMany(input.map((i) => i.id));
      const ignored_ids_lookup = new Set(ignored_accounts.map((i) => i.id));
      const allowed_to_create_accounts = input.filter((x) => !ignored_ids_lookup.has(x.id));
      await protectedUserOnlyMutation({
        ctx,
        user_id: input.map((i) => i.id),
        async operation() {
          return ctx.prisma.discordAccount.createMany({ data: allowed_to_create_accounts });
        },
      });
      return allowed_to_create_accounts.map((i) => getDefaultDiscordAccount(i));
    }),
  update: withDiscordAccountProcedure.input(z_discord_account_update).mutation(({ ctx, input }) => {
    return protectedUserOnlyMutation({
      ctx,
      user_id: input.id,
      operation: () => ctx.prisma.discordAccount.update({ where: { id: input.id }, data: input }),
    });
  }),
  updateBulk: withDiscordAccountProcedure
    .input(z.array(z_discord_account_update))
    .mutation(({ ctx, input }) => {
      return protectedUserOnlyMutation({
        ctx,
        user_id: input.map((i) => i.id),
        operation: () =>
          ctx.prisma.$transaction(
            input.map((i) => ctx.prisma.discordAccount.update({ where: { id: i.id }, data: i }))
          ),
      });
    }),
  delete: withDiscordAccountProcedure.input(z.string()).mutation(({ ctx, input }) => {
    return protectedUserOnlyMutation({
      ctx,
      user_id: input,
      async operation() {
        try {
          await ctx.prisma.discordAccount.delete({ where: { id: input } });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: "Could not find discord account to delete",
            });
          } else {
            throw error;
          }
        }
        await ignored_discord_account_router.createCaller(ctx).upsert(input);
        return true;
      },
    });
  }),
});

const account_upsert_router = router({
  upsert: withDiscordAccountProcedure.input(z_discord_account_upsert).mutation(({ ctx, input }) => {
    return upsert(
      () => account_find_router.createCaller(ctx).byId(input.id),
      () => account_crud_router.createCaller(ctx).create(input),
      () => account_crud_router.createCaller(ctx).update(input)
    );
  }),
  upsertBulk: withDiscordAccountProcedure
    .input(z.array(z_discord_account_upsert))
    .mutation(async ({ ctx, input }) => {
      return upsertMany({
        find: () => account_find_router.createCaller(ctx).byIdMany(input.map((i) => i.id)),
        create: (create) => account_crud_router.createCaller(ctx).createBulk(create),
        update: (update) => account_crud_router.createCaller(ctx).updateBulk(update),
        input,
        getFetchedDataId: (i) => i.id,
        getInputId: (i) => i.id,
      });
    }),
});

export const discordAccountRouter = mergeRouters(
  account_crud_router,
  account_find_router,
  account_upsert_router
);
