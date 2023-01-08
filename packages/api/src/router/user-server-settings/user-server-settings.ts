import {
  addFlagsToUserServerSettings,
  getDefaultUserServerSettings,
  mergeUserServerSettingsFlags,
  UserServerSettings,
  user_server_settings_flags,
} from "@answeroverflow/db";
import { z } from "zod";
import { toZObject } from "~api/utils/zod-utils";
import {
  protectedUserOnlyFetch,
  protectedUserOnlyMutation,
  protectedUserOnlyMutationFetchFirst,
} from "~api/utils/protected-procedures/user-only";
import { withDiscordAccountProcedure, mergeRouters, router } from "../trpc";
import { upsert } from "~api/utils/operations";
import { discordAccountRouter, z_discord_account_upsert } from "../accounts/discord-accounts";
import { serverRouter } from "../server/server";
import { TRPCError } from "@trpc/server";

export const SERVER_NOT_SETUP_MESSAGE = "Server is not setup for Answer Overflow yet";

const z_user_server_settings_flags = toZObject(...user_server_settings_flags);

const z_user_server_settings = z.object({
  user_id: z.string(),
  server_id: z.string(),
  flags: z_user_server_settings_flags,
});

const z_user_server_settings_required = z_user_server_settings.pick({
  user_id: true,
  server_id: true,
});

const z_user_server_settings_mutable = z_user_server_settings
  .omit({
    user_id: true,
    server_id: true,
  })
  .partial();

const z_user_server_settings_find = z_user_server_settings_required;

const z_user_server_settings_create = z_user_server_settings_mutable.merge(
  z_user_server_settings_required
);
const z_user_server_settings_create_with_deps = z_user_server_settings_create
  .omit({
    user_id: true, // we infer this from the user
  })
  .extend({
    user: z_discord_account_upsert,
  });

const z_user_server_settings_update = z_user_server_settings_mutable.merge(
  z_user_server_settings_find
);

async function transformUserServerSettings<T extends UserServerSettings>(
  user_server_settings: Promise<T>
) {
  return addFlagsToUserServerSettings(await user_server_settings);
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
        protectedUserOnlyFetch({
          ctx,
          user_id: input.user_id,
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
});

const user_server_settings_mutation_router = router({
  create: withDiscordAccountProcedure
    .input(z_user_server_settings_create)
    .mutation(async ({ input, ctx }) => {
      return transformUserServerSettings(
        protectedUserOnlyMutation({
          ctx,
          user_id: input.user_id,
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
        protectedUserOnlyMutationFetchFirst({
          ctx,
          user_id: input.user_id,
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
        protectedUserOnlyMutation({
          ctx,
          user_id: input.user.id,
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
            // eslint-disable-next-line no-unused-vars
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
