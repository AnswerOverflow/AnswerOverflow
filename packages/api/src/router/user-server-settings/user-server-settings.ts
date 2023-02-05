import {
  addFlagsToUserServerSettings,
  getDefaultUserServerSettings,
  mergeUserServerSettingsFlags,
  UserServerSettings,
  z_user_server_settings_create,
  z_user_server_settings_create_with_deps,
  z_user_server_settings_find,
  z_user_server_settings_mutable,
  z_user_server_settings_update,
} from "@answeroverflow/db";
import { z } from "zod";
import { withDiscordAccountProcedure, mergeRouters, router } from "../trpc";
import { upsert } from "~api/utils/operations";
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

async function transformUserServerSettings<T extends UserServerSettings>(
  user_server_settings: Promise<T> | T
) {
  return addFlagsToUserServerSettings(await user_server_settings);
}

async function transformUserServerSettingsArray<T extends UserServerSettings>(
  user_server_settings: Promise<T[]>
) {
  return (await user_server_settings).map(addFlagsToUserServerSettings);
}

function mergeUserServerSettings<T extends z.infer<typeof z_user_server_settings_mutable>>(
  old: UserServerSettings,
  updated: T
) {
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags ? mergeUserServerSettingsFlags(old.bitfield, flags) : undefined,
  };
}

const user_server_settings_fetch_router = router({
  byId: withDiscordAccountProcedure
    .input(z_user_server_settings_find)
    .query(async ({ input, ctx }) => {
      return transformUserServerSettings(
        protectedFetch({
          permissions: () => assertIsUser(ctx, input.user_id),
          fetch() {
            return ctx.prisma.userServerSettings.findUnique({
              where: {
                user_id_server_id: input,
              },
            });
          },
          not_found_message: "User server settings not found",
        })
      );
    }),
  byIdMany: withDiscordAccountProcedure
    .input(z.array(z_user_server_settings_find))
    .query(async ({ input, ctx }) => {
      const user_ids = input.map((x) => x.user_id);
      const server_ids = input.map((x) => x.server_id);
      return transformUserServerSettingsArray(
        protectedFetch({
          permissions: () => input.map((user) => assertIsUser(ctx, user.user_id)),
          fetch: () => {
            return ctx.prisma.userServerSettings.findMany({
              where: {
                AND: {
                  user_id: {
                    in: user_ids,
                  },
                  server_id: {
                    in: server_ids,
                  },
                },
              },
            });
          },
          not_found_message: "Could not find user server settings for users",
        })
      );
    }),
});

const user_server_settings_mutation_router = router({
  create: withDiscordAccountProcedure
    .input(z_user_server_settings_create)
    .mutation(async ({ input, ctx }) => {
      return transformUserServerSettings(
        protectedMutation({
          permissions: () => assertIsUser(ctx, input.user_id),
          operation: () =>
            ctx.prisma.userServerSettings.create({
              data: mergeUserServerSettings(
                getDefaultUserServerSettings({
                  ...input,
                }),
                input
              ),
            }),
        })
      );
    }),
  update: withDiscordAccountProcedure
    .input(z_user_server_settings_update)
    .mutation(async ({ input, ctx }) => {
      return transformUserServerSettings(
        protectedMutationFetchFirst({
          permissions: () => assertIsUser(ctx, input.user_id),
          fetch() {
            return user_server_settings_fetch_router.createCaller(ctx).byId({
              user_id: input.user_id,
              server_id: input.server_id,
            });
          },
          not_found_message: "User server settings not found",
          operation: (old) =>
            ctx.prisma.userServerSettings.update({
              where: {
                user_id_server_id: {
                  user_id: input.user_id,
                  server_id: input.server_id,
                },
              },
              data: mergeUserServerSettings(old, input),
            }),
        })
      );
    }),
});

const user_server_settings_with_deps_router = router({
  createWithDeps: withDiscordAccountProcedure
    .input(z_user_server_settings_create_with_deps)
    .mutation(async ({ input, ctx }) => {
      return transformUserServerSettings(
        protectedMutation({
          permissions: () => assertIsUser(ctx, input.user.id),
          async operation() {
            // We do not create the server as a dependency as that action should only be handled by the server owner or Answer Overflow bot
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
            const merged_data = mergeUserServerSettings(
              getDefaultUserServerSettings({
                user_id: input.user.id,
                ...input,
              }),
              {
                user_id: input.user.id,
                ...input,
              }
            );

            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { user, ...data_without_user } = merged_data;
            return ctx.prisma.userServerSettings.create({
              data: data_without_user,
            });
          },
        })
      );
    }),
});

const user_server_settings_upsert = router({
  upsert: withDiscordAccountProcedure
    .input(z_user_server_settings_create)
    .mutation(async ({ input, ctx }) => {
      return upsert(
        () =>
          user_server_settings_fetch_router.createCaller(ctx).byId({
            user_id: input.user_id,
            server_id: input.server_id,
          }),
        () => user_server_settings_mutation_router.createCaller(ctx).create(input),
        () => user_server_settings_mutation_router.createCaller(ctx).update(input)
      );
    }),
  upsertWithDeps: withDiscordAccountProcedure
    .input(z_user_server_settings_create_with_deps)
    .mutation(async ({ input, ctx }) => {
      return upsert(
        () =>
          user_server_settings_fetch_router.createCaller(ctx).byId({
            user_id: input.user.id,
            server_id: input.server_id,
          }),
        () => user_server_settings_with_deps_router.createCaller(ctx).createWithDeps(input),
        () =>
          user_server_settings_mutation_router
            .createCaller(ctx)
            .update({ ...input, user_id: input.user.id })
      );
    }),
});

export const userServerSettingsRouter = mergeRouters(
  user_server_settings_fetch_router,
  user_server_settings_mutation_router,
  user_server_settings_with_deps_router,
  user_server_settings_upsert
);
