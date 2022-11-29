import { z } from "zod";
import { publicProcedure, router, mergeRouters } from "../../trpc";
import { bitfieldToDict, toZObject } from "../../utils/bitfield";
import { findOrCreateServer, serverRouter, server_create_input } from "../server/server";
import { findOrCreateUser, userRouter, user_create_input } from "../user/user";

const user_server_settings_flags = [
  "allowed_to_show_messages",
  "message_indexing_disabled",
] as const;

const z_user_server_settings_flags = toZObject(...user_server_settings_flags);

const bitfieldToServerSettingsFlags = (bitfield: number) =>
  bitfieldToDict(bitfield, user_server_settings_flags);

const findById = publicProcedure
  .input(
    z.object({
      user_id: z.string(),
      server_id: z.string(),
    })
  )
  .query(({ ctx, input }) => {
    return ctx.prisma.userServerSettings.findFirst({
      where: {
        user_id: input.user_id,
        server_id: input.server_id,
      },
    });
  });

const update = publicProcedure
  .input(
    z.object({
      user_id: z.string(),
      server_id: z.string(),
      flags: z_user_server_settings_flags,
      old_settings: z.object({
        bitfield: z.number(),
      }),
    })
  )
  .mutation(async ({ ctx, input }) => {
    const data = await ctx.prisma.userServerSettings.update({
      where: {
        user_id_server_id: {
          user_id: input.user_id,
          server_id: input.server_id,
        },
      },
      data: {
        bitfield: 1,
      },
    });
    return { ...data, flags: bitfieldToServerSettingsFlags(data.bitfield) };
  });

const create = publicProcedure
  .input(
    z.object({
      user_id: z.string(),
      server_id: z.string(),
      flags: z_user_server_settings_flags,
    })
  )
  .mutation(async ({ ctx, input }) => {
    const data = await ctx.prisma.userServerSettings.create({
      data: {
        bitfield: 0,
        user: {
          connect: {
            id: input.user_id,
          },
        },
        server: {
          connect: {
            id: input.server_id,
          },
        },
      },
    });
    return { ...data, flags: bitfieldToServerSettingsFlags(data.bitfield) };
  });

const userServerSettingsOperations = router({
  findById: findById,
  update: update,
  create: create,
});

const userServerSettingsUpsert = router({
  upsert: publicProcedure
    .input(
      z.object({
        user: user_create_input,
        server: server_create_input,
        user_server_settings: z.object({
          flags: z_user_server_settings_flags,
        }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user_server_settings_router = userServerSettingsOperations.createCaller(ctx);
      const existing_user_server_settings = await user_server_settings_router.findById({
        user_id: input.user.id,
        server_id: input.server.id,
      });
      if (existing_user_server_settings) {
        return user_server_settings_router.update({
          user_id: input.user.id,
          server_id: input.server.id,
          flags: input.user_server_settings.flags,
          old_settings: existing_user_server_settings,
        });
      } else {
        const [user, server] = await Promise.all([
          findOrCreateUser(userRouter.createCaller(ctx), input.user),
          findOrCreateServer(serverRouter.createCaller(ctx), input.server),
        ]);
        return user_server_settings_router.create({
          user_id: user.id,
          server_id: server.id,
          flags: input.user_server_settings.flags,
        });
      }
    }),
});

export const userServerSettingsRouter = mergeRouters(
  userServerSettingsOperations,
  userServerSettingsUpsert
);
