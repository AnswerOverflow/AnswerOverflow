import {
  createUserServerSettings,
  findUserServerSettingsById,
  updateUserServerSettings,
  upsert,
  z_user_server_settings_create,
  z_user_server_settings_create_with_deps,
  z_user_server_settings_find,
  z_user_server_settings_update,
} from "@answeroverflow/db";
import { withDiscordAccountProcedure, mergeRouters, router } from "../trpc";
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

const user_server_settings_crud_router = router({
  byId: withDiscordAccountProcedure
    .input(z_user_server_settings_find)
    .query(async ({ input, ctx }) => {
      return protectedFetch({
        permissions: () => assertIsUser(ctx, input.user_id),
        fetch: () => findUserServerSettingsById(input),
        not_found_message: "User server settings not found",
      });
    }),
  create: withDiscordAccountProcedure
    .input(z_user_server_settings_create)
    .mutation(async ({ input, ctx }) => {
      return protectedMutation({
        permissions: () => assertIsUser(ctx, input.user_id),
        operation: () => createUserServerSettings(input),
      });
    }),
  update: withDiscordAccountProcedure
    .input(z_user_server_settings_update)
    .mutation(async ({ input, ctx }) => {
      return protectedMutationFetchFirst({
        permissions: () => assertIsUser(ctx, input.user_id),
        not_found_message: "User server settings not found",
        fetch: () =>
          findUserServerSettingsById({
            user_id: input.user_id,
            server_id: input.server_id,
          }),
        operation: (old) => updateUserServerSettings(input, old),
      });
    }),
});

const user_server_settings_with_deps_router = router({
  createWithDeps: withDiscordAccountProcedure
    .input(z_user_server_settings_create_with_deps)
    .mutation(async ({ input, ctx }) => {
      try {
        await serverRouter.createCaller(ctx).byId(input.server_id);
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
      return user_server_settings_crud_router.createCaller(ctx).create({
        ...input,
        user_id: input.user.id,
      });
    }),
});

const user_server_settings_upsert = router({
  upsert: withDiscordAccountProcedure
    .input(z_user_server_settings_create)
    .mutation(async ({ input, ctx }) => {
      return upsert({
        find: () =>
          findUserServerSettingsById({
            user_id: input.user_id,
            server_id: input.server_id,
          }),
        create: () => user_server_settings_crud_router.createCaller(ctx).create(input),
        update: () => user_server_settings_crud_router.createCaller(ctx).update(input),
      });
    }),
  upsertWithDeps: withDiscordAccountProcedure
    .input(z_user_server_settings_create_with_deps)
    .mutation(async ({ input, ctx }) => {
      return upsert({
        find: () =>
          findUserServerSettingsById({
            user_id: input.user.id,
            server_id: input.server_id,
          }),
        create: () => user_server_settings_with_deps_router.createCaller(ctx).createWithDeps(input),
        update: () =>
          user_server_settings_crud_router
            .createCaller(ctx)
            .update({ ...input, user_id: input.user.id }),
      });
    }),
});

export const userServerSettingsRouter = mergeRouters(
  user_server_settings_crud_router,
  user_server_settings_with_deps_router,
  user_server_settings_upsert
);
