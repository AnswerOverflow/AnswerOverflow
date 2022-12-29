import {
  addChannelSettingsFlagsToChannelSettings,
  bitfieldToChannelSettingsFlags,
  Channel,
  ChannelSettings,
  channel_settings_flags,
  getDefaultChannelSettings,
  Server,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "~api/router/trpc";
import { dictToBitfield } from "@answeroverflow/db";
import { channelRouter, z_channel_upsert_with_deps, makeChannelUpsertWithDeps } from "./channel";
import { toZObject } from "~api/utils/zod-utils";
import {
  protectedServerManagerFetch,
  protectedServerManagerMutationFetchFirst,
  upsert,
} from "~api/utils/operations";
import type { inferRouterInputs } from "@trpc/server";

const z_channel_settings_flags = toZObject(...channel_settings_flags);

const z_channel_settings_create = z.object({
  channel_id: z.string(),
  flags: z.optional(z_channel_settings_flags),
  last_indexed_snowflake: z.optional(z.string()),
  invite_code: z.optional(z.string()),
  solution_tag_id: z.string().nullable().optional(),
});

const z_channel_settings_mutable = z_channel_settings_create.omit({ channel_id: true }).partial();

const z_channel_settings_update = z.object({
  channel_id: z.string(),
  data: z_channel_settings_mutable,
});

const z_channel_settings_upsert = z.object({
  create: z_channel_settings_create,
  update: z_channel_settings_update,
});

function mergeChannelSettings(
  old: ChannelSettings,
  updated: z.infer<typeof z_channel_settings_mutable>
) {
  const old_flags = bitfieldToChannelSettingsFlags(old.bitfield);
  const new_flags = { ...old_flags, ...updated.flags };
  const flags_to_bitfield_value = dictToBitfield(new_flags, channel_settings_flags);
  // eslint-disable-next-line no-unused-vars
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

const channelSettingsCreateUpdate = router({
  create: protectedProcedureWithUserServers
    .input(z_channel_settings_create)
    .mutation(async ({ ctx, input }) => {
      return transformChannelSettingsReturn(() =>
        protectedServerManagerMutationFetchFirst({
          fetch: () => channelRouter.createCaller(ctx).byId(input.channel_id),
          getServerId: (data) => data.server_id,
          operation: async (channel) => {
            const new_settings = mergeChannelSettings(getDefaultChannelSettings(channel.id), input);
            const data = await ctx.prisma.channelSettings.create({
              data: { ...new_settings, channel_id: channel.id },
            });
            return data;
          },
          ctx,
          not_found_message: "Channel not found",
        })
      );
    }),
  update: protectedProcedureWithUserServers
    .input(z_channel_settings_update)
    .mutation(async ({ ctx, input }) => {
      return transformChannelSettingsReturn(() =>
        protectedServerManagerMutationFetchFirst({
          fetch: () => channelSettingFind.createCaller(ctx).byId(input.channel_id),
          getServerId: (data) => data.channel.server_id,
          operation: async (existing_settings) => {
            const new_settings = mergeChannelSettings(existing_settings, input.data);
            return ctx.prisma.channelSettings.update({
              where: {
                channel_id: input.channel_id,
              },
              data: new_settings,
            });
          },
          ctx,
          not_found_message: "Channel settings not found",
        })
      );
    }),
});

const z_channel_settings_create_with_deps = z.object({
  channel: z_channel_upsert_with_deps,
  settings: z_channel_settings_create,
});

const channelSettingsCreateWithDeps = router({
  createWithDeps: protectedProcedureWithUserServers
    .input(z_channel_settings_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await channelRouter.createCaller(ctx).upsertWithDeps(input.channel);
      return channelSettingsCreateUpdate.createCaller(ctx).create(input.settings);
    }),
});

const channelSettingFind = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    return transformChannelSettingsReturn(() =>
      protectedServerManagerFetch({
        fetch: () =>
          ctx.prisma.channelSettings.findUnique({
            where: {
              channel_id: input,
            },
            include: {
              channel: {
                select: {
                  server_id: true,
                },
              },
            },
          }),
        ctx,
        getServerId: (channel_settings) => channel_settings.channel.server_id,
        not_found_message: "Channel settings not found",
      })
    );
  }),
  byInviteCode: protectedProcedureWithUserServers
    .input(z.string())
    .query(async ({ ctx, input }) => {
      return transformChannelSettingsReturn(() =>
        protectedServerManagerFetch({
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
          ctx,
          getServerId: (channel_settings) => channel_settings.channel.server_id,
          not_found_message: "Channel settings not found",
        })
      );
    }),
});

const z_channel_settings_upsert_with_deps = z.object({
  create: z_channel_settings_create_with_deps,
  update: z_channel_settings_update,
});

const channelSettingsUpsert = router({
  upsert: protectedProcedureWithUserServers
    .input(z_channel_settings_upsert)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => channelSettingFind.createCaller(ctx).byId(input.create.channel_id),
        () => channelSettingsCreateUpdate.createCaller(ctx).create(input.create),
        () => channelSettingsCreateUpdate.createCaller(ctx).update(input.update)
      );
    }),
  upsertWithDeps: protectedProcedureWithUserServers
    .input(z_channel_settings_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => channelSettingFind.createCaller(ctx).byId(input.create.channel.create.channel.id),
        () => channelSettingsCreateWithDeps.createCaller(ctx).createWithDeps(input.create),
        () => channelSettingsCreateUpdate.createCaller(ctx).update(input.update)
      );
    }),
});

export const channelSettingsRouter = mergeRouters(
  channelSettingsUpsert,
  channelSettingFind,
  channelSettingsCreateUpdate,
  channelSettingsCreateWithDeps
);

export function makeChannelSettingsCreateWithDepsInput(
  channel: Channel,
  server: Server,
  initial: z.infer<typeof z_channel_settings_mutable>
): inferRouterInputs<typeof channelSettingsCreateWithDeps>["createWithDeps"] {
  return {
    channel: makeChannelUpsertWithDeps(channel, server),
    settings: {
      channel_id: channel.id,
      ...initial,
    },
  };
}

export function makeChannelSettingsUpsertWithDeps(
  channel: Channel,
  server: Server,
  update: z.infer<typeof z_channel_settings_mutable>
): inferRouterInputs<typeof channelSettingsUpsert>["upsertWithDeps"] {
  return {
    create: makeChannelSettingsCreateWithDepsInput(channel, server, update),
    update: {
      channel_id: channel.id,
      data: update,
    },
  };
}
