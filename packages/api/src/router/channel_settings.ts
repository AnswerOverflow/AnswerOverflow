import {
  addChannelSettingsFlagsToChannelSettings,
  bitfieldToChannelSettingsFlags,
  ChannelSettings,
  channel_settings_flags,
  getDefaultChannelSettings,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "../trpc";
import { dictToBitfield } from "@answeroverflow/db";
import { channelRouter, z_channel_upsert_with_deps } from "./channel";
import { assertCanEditServer } from "~api/utils/permissions";
import { toZObject } from "~api/utils/zod-utils";
import { TRPCError } from "@trpc/server";
import { upsert } from "../utils/operations";

const z_channel_settings_flags = toZObject(...channel_settings_flags);

const z_channel_settings_update = z.object({
  channel_id: z.string(),
  flags: z.optional(z_channel_settings_flags),
  last_indexed_snowflake: z.optional(z.string()),
  invite_code: z.string().nullable().optional(),
  solution_tag_id: z.optional(z.nullable(z.string())),
});

const z_channel_settings_create = z.object({
  channel_id: z.string(),
  flags: z.optional(z_channel_settings_flags),
  last_indexed_snowflake: z.optional(z.string()),
  invite_code: z.optional(z.string()),
  solution_tag_id: z.string().nullable().optional(),
});

const z_channel_settings_upsert = z.object({
  create: z_channel_settings_create,
  update: z_channel_settings_update,
});

function mergeChannelSettings(
  old: ChannelSettings,
  updated: z.infer<typeof z_channel_settings_update>
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

const channelSettingsCreateUpdate = router({
  create: protectedProcedureWithUserServers
    .input(z_channel_settings_create)
    .mutation(async ({ ctx, input }) => {
      const channel = await channelRouter.createCaller(ctx).byId(input.channel_id);
      if (!channel) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Channel does not exist",
        });
      }
      assertCanEditServer(ctx, channel.server_id);
      const new_settings = mergeChannelSettings(getDefaultChannelSettings(input.channel_id), input);
      const data = await ctx.prisma.channelSettings.create({ data: new_settings });
      return addChannelSettingsFlagsToChannelSettings(data);
    }),
  update: protectedProcedureWithUserServers
    .input(z_channel_settings_update)
    .mutation(async ({ ctx, input }) => {
      const existing_channel_settings = await channelSettingFind
        .createCaller(ctx)
        .byId(input.channel_id);
      if (!existing_channel_settings) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Channel settings do not exist",
        });
      }
      assertCanEditServer(ctx, existing_channel_settings.channel.server_id);
      const new_settings = mergeChannelSettings(existing_channel_settings, input);
      const data = await ctx.prisma.channelSettings.update({
        where: {
          channel_id: input.channel_id,
        },
        data: new_settings,
      });
      return addChannelSettingsFlagsToChannelSettings(data);
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
    const data = await ctx.prisma.channelSettings.findUnique({
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
    });
    if (!data) return null;
    // TODO: This would work create as a middleware / in some other place but it relies on data from this function
    assertCanEditServer(ctx, data.channel.server_id);
    return addChannelSettingsFlagsToChannelSettings(data);
  }),
  byInviteCode: protectedProcedureWithUserServers
    .input(z.string())
    .query(async ({ ctx, input }) => {
      const data = await ctx.prisma.channelSettings.findUnique({
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
      });
      if (!data) return null;
      assertCanEditServer(ctx, data.channel.server_id);
      return addChannelSettingsFlagsToChannelSettings(data);
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
