import type { ChannelSettings } from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "../trpc";
import { bitfieldToDict, dictToBitfield, toZObject } from "../utils/bitfield";
import { assertCanEditServer } from "../utils/permissions";
import { channelRouter, channel_upsert_input } from "./channel";

const channel_settings_flags = [
  "indexing_enabled",
  "auto_thread_enabled",
  "mark_solution_enabled",
  "send_mark_solution_instructions_in_new_threads",
  "forum_guidelines_consent_enabled",
] as const;

const z_channel_settings_flags = toZObject(...channel_settings_flags);

const bitfieldToChannelSettingsFlags = (bitfield: number) =>
  bitfieldToDict(bitfield, channel_settings_flags);

export const addChannelSettingsFlagsToChannelSettings = (channel_settings: ChannelSettings) => ({
  ...channel_settings,
  flags: bitfieldToChannelSettingsFlags(channel_settings.bitfield),
});

const z_channel_settings = z.object({
  channel_id: z.string(),
  bitfield: z.number(),
});

const z_channel_settings_create_input = z.object({
  flags: z.optional(z_channel_settings_flags),
  channel: channel_upsert_input,
});

const z_channel_settings_update_input = z.object({
  flags: z.optional(z_channel_settings_flags),
  last_indexed_snowflake: z.optional(z.string()),
  invite_code: z.optional(z.string()),
  solution_tag_id: z.optional(z.nullable(z.string())),
});

const z_channel_settings_upsert_input = z.object({
  create: z_channel_settings_create_input,
  update: z_channel_settings_update_input,
});

const channelSettingsCreateUpdate = router({
  create: protectedProcedureWithUserServers
    .input(z_channel_settings_create_input)
    .mutation(async ({ ctx, input }) => {
      const channel = await channelRouter.createCaller(ctx).upsert(input.channel);
      const old_flags = bitfieldToChannelSettingsFlags(0);
      const new_flags = { ...old_flags, ...input.flags };
      const bitfield = dictToBitfield(new_flags, channel_settings_flags);
      assertCanEditServer(ctx, channel.server_id);
      const data = await ctx.prisma.channelSettings.create({
        data: {
          channel: {
            connect: {
              id: channel.id,
            },
          },
          bitfield,
        },
      });
      return addChannelSettingsFlagsToChannelSettings(data);
    }),
  update: protectedProcedureWithUserServers
    .input(
      z.object({
        update: z_channel_settings_update_input,
        old: z_channel_settings,
        server_id: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      assertCanEditServer(ctx, input.server_id);

      const old_flags = bitfieldToChannelSettingsFlags(input.old.bitfield);
      const new_flags = { ...old_flags, ...input.update.flags };
      const flags_to_bitfield_value = dictToBitfield(new_flags, channel_settings_flags);
      // eslint-disable-next-line no-unused-vars
      const { flags, ...update_data_without_flags } = input.update;
      const data = await ctx.prisma.channelSettings.update({
        where: {
          channel_id: input.old.channel_id,
        },
        data: {
          ...update_data_without_flags,
          bitfield: flags_to_bitfield_value,
        },
      });
      return addChannelSettingsFlagsToChannelSettings(data);
    }),
});

const channelSettingFind = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    const data = await ctx.prisma.channelSettings.findUnique({
      where: {
        channel_id: input,
      },
      include: {
        channel: true,
      },
    });
    if (!data) return null;
    // TODO: This would work create as a middleware / in some other place but it relies on data from this function
    assertCanEditServer(ctx, data.channel.server_id);
    return addChannelSettingsFlagsToChannelSettings(data);
  }),
});

const channelSettingsUpsert = router({
  upsert: protectedProcedureWithUserServers
    .input(z_channel_settings_upsert_input)
    .mutation(async ({ ctx, input }) => {
      const existing_channel_settings = await channelSettingFind
        .createCaller(ctx)
        .byId(input.create.channel.create.id);

      if (existing_channel_settings) {
        return channelSettingsCreateUpdate.createCaller(ctx).update({
          update: {
            ...input.update,
          },
          old: existing_channel_settings,
          server_id: input.create.channel.create.server.create.id,
        });
      } else {
        return await channelSettingsCreateUpdate.createCaller(ctx).create(input.create);
      }
    }),
});

export const channelSettingsRouter = mergeRouters(channelSettingsUpsert, channelSettingFind);
