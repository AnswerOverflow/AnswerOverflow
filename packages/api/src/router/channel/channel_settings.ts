import {
  addChannelSettingsFlagsToChannelSettings,
  bitfieldToChannelSettingsFlags,
  ChannelSettings,
  channel_settings_flags,
  getDefaultChannelSettings,
  PrismaClient,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "~api/router/trpc";
import { dictToBitfield } from "@answeroverflow/db";
import { channelRouter, z_channel_upsert_with_deps } from "./channel";
import { toZObject } from "~api/utils/zod-utils";
import { findOrThrowNotFound, upsert } from "~api/utils/operations";
import { protectedFetch, protectedMutationFetchFirst } from "~api/utils/protected-procedures";
import { canEditServerBotOnly, assertCanEditServer } from "~api/utils/permissions";

const z_channel_settings_flags = toZObject(...channel_settings_flags);

const z_channel_settings = z.object({
  channel_id: z.string(),
  flags: z_channel_settings_flags,
  last_indexed_snowflake: z.string().nullable(),
  invite_code: z.string().nullable(),
  solution_tag_id: z.string().nullable(),
});

const z_channel_settings_required = z_channel_settings.pick({
  channel_id: true,
});

const z_channel_settings_mutable = z_channel_settings
  .omit({
    channel_id: true,
  })
  .partial();

const z_channel_settings_create = z_channel_settings_mutable.merge(z_channel_settings_required);

const z_channel_settings_create_with_deps = z_channel_settings_create
  .omit({
    channel_id: true, // Taken from channel
  })
  .extend({
    channel: z_channel_upsert_with_deps,
  });

const z_channel_settings_update = z_channel_settings_mutable.merge(
  z_channel_settings.pick({
    channel_id: true,
  })
);

const z_channel_settings_upsert = z_channel_settings_create;

const z_channel_settings_upsert_with_deps = z_channel_settings_create_with_deps;

function mergeChannelSettings(
  old: ChannelSettings,
  updated: z.infer<typeof z_channel_settings_mutable>
) {
  const old_flags = bitfieldToChannelSettingsFlags(old.bitfield);
  const new_flags = { ...old_flags, ...updated.flags };
  const flags_to_bitfield_value = dictToBitfield(new_flags, channel_settings_flags);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { flags, ...update_data_without_flags } = updated;
  return {
    ...update_data_without_flags,
    bitfield: flags_to_bitfield_value,
  };
}

async function transformChannelSettingsReturn<T extends ChannelSettings>(
  channel_settings: () => Promise<T>
) {
  const data = await channel_settings();
  return addChannelSettingsFlagsToChannelSettings(data);
}

function findChannelSettingsById(
  channel_id: string,
  prisma: PrismaClient,
  not_found_message: string
) {
  return transformChannelSettingsReturn(() =>
    findOrThrowNotFound(
      () =>
        prisma.channelSettings.findUnique({
          where: {
            channel_id,
          },
          include: {
            channel: {
              select: {
                server_id: true,
              },
            },
          },
        }),
      not_found_message
    )
  );
}

const channelSettingFind = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return transformChannelSettingsReturn(() =>
      protectedFetch({
        fetch: () => findChannelSettingsById(input, ctx.prisma, "Channel settings not found"),
        permissions: (data) => assertCanEditServer(ctx, data.channel.server_id),
        not_found_message: "Channel settings not found",
      })
    );
  }),
  byInviteCode: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return transformChannelSettingsReturn(() =>
      protectedFetch({
        fetch: () =>
          ctx.prisma.channelSettings.findUnique({
            where: {
              invite_code: input,
            },
            include: {
              channel: {
                select: {
                  server_id: true,
                },
              },
            },
          }),
        permissions: (data) => canEditServerBotOnly(ctx, data.channel.server_id),
        not_found_message: "Channel settings not found",
      })
    );
  }),
});

const channelSettingsCreateUpdate = router({
  create: publicProcedure.input(z_channel_settings_create).mutation(async ({ ctx, input }) => {
    return transformChannelSettingsReturn(() =>
      protectedMutationFetchFirst({
        fetch: () => channelRouter.createCaller(ctx).byId(input.channel_id),
        operation: async (channel) => {
          const new_settings = mergeChannelSettings(getDefaultChannelSettings(channel.id), input);
          const data = await ctx.prisma.channelSettings.create({
            data: { ...new_settings, channel_id: channel.id },
          });
          return data;
        },
        permissions: (data) => canEditServerBotOnly(ctx, data.server_id),
        not_found_message: "Channel not found",
      })
    );
  }),
  update: publicProcedure.input(z_channel_settings_update).mutation(async ({ ctx, input }) => {
    return transformChannelSettingsReturn(() =>
      protectedMutationFetchFirst({
        fetch: () =>
          findChannelSettingsById(input.channel_id, ctx.prisma, "Channel settings not found"),
        operation: async (existing_settings) => {
          const new_settings = mergeChannelSettings(existing_settings, input);
          return ctx.prisma.channelSettings.update({
            where: {
              channel_id: input.channel_id,
            },
            data: new_settings,
          });
        },
        permissions: (data) => canEditServerBotOnly(ctx, data.channel.server_id),
        not_found_message: "Channel settings not found",
      })
    );
  }),
});

const channelSettingsCreateWithDeps = router({
  createWithDeps: publicProcedure
    .input(z_channel_settings_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      const { channel, ...settings } = input;
      await channelRouter.createCaller(ctx).upsertWithDeps(channel);
      return channelSettingsCreateUpdate
        .createCaller(ctx)
        .create({ channel_id: channel.id, ...settings });
    }),
});

const channelSettingsUpsert = router({
  upsert: publicProcedure.input(z_channel_settings_upsert).mutation(async ({ ctx, input }) => {
    return upsert(
      () => channelSettingFind.createCaller(ctx).byId(input.channel_id),
      () => channelSettingsCreateUpdate.createCaller(ctx).create(input),
      () => channelSettingsCreateUpdate.createCaller(ctx).update(input)
    );
  }),
  upsertWithDeps: publicProcedure
    .input(z_channel_settings_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => channelSettingFind.createCaller(ctx).byId(input.channel.id),
        () => channelSettingsCreateWithDeps.createCaller(ctx).createWithDeps(input),
        () =>
          channelSettingsCreateUpdate
            .createCaller(ctx)
            .update({ channel_id: input.channel.id, ...input })
      );
    }),
});

export const channelSettingsRouter = mergeRouters(
  channelSettingsUpsert,
  channelSettingFind,
  channelSettingsCreateUpdate,
  channelSettingsCreateWithDeps
);
