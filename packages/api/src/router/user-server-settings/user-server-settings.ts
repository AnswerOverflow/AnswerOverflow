import {
  addFlagsToUserServerSettings,
  DiscordAccount,
  getDefaultUserServerSettings,
  mergeUserServerSettingsFlags,
  Server,
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
import { authedProcedure, mergeRouters, router } from "../trpc";
import { upsert } from "~api/utils/operations";
import {
  discordAccountRouter,
  makeDiscordAccountUpsert,
  z_discord_account_upser_input,
} from "../accounts/discord-accounts";
import { serverRouter } from "../server/server";
import { inferRouterInputs, TRPCError } from "@trpc/server";

export const SERVER_NOT_SETUP_MESSAGE = "Server is not setup for Answer Overflow yet";

const z_user_server_settings_flags = toZObject(...user_server_settings_flags);

const z_user_server_settings_id = z.object({
  user_id: z.string(),
  server_id: z.string(),
});

const z_user_server_settings_create = z_user_server_settings_id.extend({
  flags: z.optional(z_user_server_settings_flags),
});

const z_user_server_settings_mutable = z_user_server_settings_create.extend({}).partial().omit({
  user_id: true,
  server_id: true,
});

const z_user_server_settings_update = z_user_server_settings_id.extend({
  data: z_user_server_settings_mutable,
});

const z_user_server_settings_create_with_deps = z.object({
  user_server_settings: z_user_server_settings_create,
  user: z_discord_account_upser_input,
});

const z_user_server_settings_upsert = z.object({
  create: z_user_server_settings_create,
  update: z_user_server_settings_update,
});

const z_user_server_settings_upsert_with_deps = z.object({
  create: z_user_server_settings_create_with_deps,
  update: z_user_server_settings_update,
});

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
  byId: authedProcedure.input(z_user_server_settings_id).query(async ({ input, ctx }) => {
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
  create: authedProcedure.input(z_user_server_settings_create).mutation(async ({ input, ctx }) => {
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
  update: authedProcedure.input(z_user_server_settings_update).mutation(async ({ input, ctx }) => {
    return transformUserServerSettings(
      protectedUserOnlyMutationFetchFirst({
        ctx,
        user_id: input.user_id,
        fetch() {
          return user_server_settings_fetch_router.createCaller(ctx).byId(input);
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
            data: mergeUserServerSettings(old, input.data),
          }),
      })
    );
  }),
});

const user_server_settings_with_deps_router = router({
  createWithDeps: authedProcedure
    .input(z_user_server_settings_create_with_deps)
    .mutation(async ({ input, ctx }) => {
      return transformUserServerSettings(
        protectedUserOnlyMutation({
          ctx,
          user_id: input.user_server_settings.user_id,
          async operation() {
            // We do not create the server as a dependency as that action should only be handled by the server owner or Answer Overflow bot
            try {
              await serverRouter.createCaller(ctx).byId(input.user_server_settings.server_id);
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
            return ctx.prisma.userServerSettings.create({
              data: mergeUserServerSettings(
                getDefaultUserServerSettings({
                  ...input.user_server_settings,
                }),
                input.user_server_settings
              ),
            });
          },
        })
      );
    }),
});

const user_server_settings_upsert = router({
  upsert: authedProcedure.input(z_user_server_settings_upsert).mutation(async ({ input, ctx }) => {
    return upsert(
      () => user_server_settings_fetch_router.createCaller(ctx).byId(input.create),
      () => user_server_settings_mutation_router.createCaller(ctx).create(input.create),
      () => user_server_settings_mutation_router.createCaller(ctx).update(input.update)
    );
  }),
  upsertWithDeps: authedProcedure
    .input(z_user_server_settings_upsert_with_deps)
    .mutation(async ({ input, ctx }) => {
      return upsert(
        () =>
          user_server_settings_fetch_router.createCaller(ctx).byId({
            user_id: input.create.user_server_settings.user_id,
            server_id: input.create.user_server_settings.server_id,
          }),
        () => user_server_settings_with_deps_router.createCaller(ctx).createWithDeps(input.create),
        () => user_server_settings_mutation_router.createCaller(ctx).update(input.update)
      );
    }),
});

export const userServerSettingsRouter = mergeRouters(
  user_server_settings_fetch_router,
  user_server_settings_mutation_router,
  user_server_settings_with_deps_router,
  user_server_settings_upsert
);

export function makeUserServerSettingsCreateWithDeps(
  user: DiscordAccount,
  server: Server,
  update: z.infer<typeof z_user_server_settings_mutable> = {}
) {
  const data: inferRouterInputs<typeof user_server_settings_with_deps_router>["createWithDeps"] = {
    user: makeDiscordAccountUpsert(user, {}),
    user_server_settings: {
      user_id: user.id,
      server_id: server.id,
      ...update,
    },
  };
  return data;
}

export function makeUserServerSettingsUpsert(
  user: DiscordAccount,
  server: Server,
  update: z.infer<typeof z_user_server_settings_mutable> = {}
) {
  const data: inferRouterInputs<typeof user_server_settings_upsert>["upsert"] = {
    create: {
      user_id: user.id,
      server_id: server.id,
      ...update,
    },
    update: {
      data: update,
      server_id: server.id,
      user_id: user.id,
    },
  };
  return data;
}

export function makeUserServerSettingsUpsertWithDeps(
  user: DiscordAccount,
  server: Server,
  update: z.infer<typeof z_user_server_settings_mutable> = {}
): inferRouterInputs<typeof user_server_settings_upsert>["upsertWithDeps"] {
  return {
    create: makeUserServerSettingsCreateWithDeps(user, server, update),
    update: {
      data: update,
      server_id: server.id,
      user_id: user.id,
    },
  };
}
