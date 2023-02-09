import {
  createUserServerSettings,
  findUserServerSettingsById,
  updateUserServerSettings,
  upsert,
  zUserServerSettingsCreate,
  zUserServerSettingsCreateWithDeps,
  zUserServerSettingsFind,
  zUserServerSettingsUpdate,
} from "@answeroverflow/db";
import { withDiscordAccountProcedure, MergeRouters, router } from "../trpc";
import { discordAccountRouter } from "../users/accounts/discord-accounts";
import { serverRouter } from "../server/server";
import { TRPCError } from "@trpc/server";
import {
  protectedFetch,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";
import { assertIsUser } from "~api/utils/permissions";

export const SERVER_NOT_SETUP_MESSAGE = "Server is not setup for Answer Overflow yet";

const userServerSettingsCrudRouter = router({
  byId: withDiscordAccountProcedure.input(zUserServerSettingsFind).query(async ({ input, ctx }) => {
    return protectedFetch({
      permissions: () => assertIsUser(ctx, input.userId),
      fetch: () => findUserServerSettingsById(input),
      notFoundMessage: "User server settings not found",
    });
  }),
  create: withDiscordAccountProcedure
    .input(zUserServerSettingsCreate)
    .mutation(async ({ input, ctx }) => {
      return protectedMutation({
        permissions: () => assertIsUser(ctx, input.userId),
        operation: () => createUserServerSettings(input),
      });
    }),
  update: withDiscordAccountProcedure
    .input(zUserServerSettingsUpdate)
    .mutation(async ({ input, ctx }) => {
      return protectedMutationFetchFirst({
        permissions: () => assertIsUser(ctx, input.userId),
        notFoundMessage: "User server settings not found",
        fetch: () =>
          findUserServerSettingsById({
            userId: input.userId,
            serverId: input.serverId,
          }),
        operation: (old) => updateUserServerSettings(input, old),
      });
    }),
});

const userServerSettingsWithDepsRouter = router({
  createWithDeps: withDiscordAccountProcedure
    .input(zUserServerSettingsCreateWithDeps)
    .mutation(async ({ input, ctx }) => {
      try {
        await serverRouter.createCaller(ctx).byId(input.serverId);
      } catch (error) {
        if (error instanceof TRPCError) {
          if (error.code === "NOT_FOUND") {
            throw new TRPCError({
              code: "NOT_FOUND",
              message: SERVER_NOT_SETUP_MESSAGE,
            });
          }
        }
      }

      await discordAccountRouter.createCaller(ctx).upsert(input.user);
      return userServerSettingsCrudRouter.createCaller(ctx).create({
        ...input,
        userId: input.user.id,
      });
    }),
});

const userServerSettingsUpsert = router({
  upsert: withDiscordAccountProcedure
    .input(zUserServerSettingsCreate)
    .mutation(async ({ input, ctx }) => {
      return upsert({
        find: () =>
          findUserServerSettingsById({
            userId: input.userId,
            serverId: input.serverId,
          }),
        create: () => userServerSettingsCrudRouter.createCaller(ctx).create(input),
        update: () => userServerSettingsCrudRouter.createCaller(ctx).update(input),
      });
    }),
  upsertWithDeps: withDiscordAccountProcedure
    .input(zUserServerSettingsCreateWithDeps)
    .mutation(async ({ input, ctx }) => {
      return upsert({
        find: () =>
          findUserServerSettingsById({
            userId: input.user.id,
            serverId: input.serverId,
          }),
        create: () => userServerSettingsWithDepsRouter.createCaller(ctx).createWithDeps(input),
        update: () =>
          userServerSettingsCrudRouter
            .createCaller(ctx)
            .update({ ...input, userId: input.user.id }),
      });
    }),
});

export const userServerSettingsRouter = MergeRouters(
  userServerSettingsCrudRouter,
  userServerSettingsWithDepsRouter,
  userServerSettingsUpsert
);
