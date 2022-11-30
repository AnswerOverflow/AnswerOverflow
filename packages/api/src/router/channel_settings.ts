import { ChannelSettings } from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "../trpc";
import { bitfieldToDict, toZObject } from "../utils/bitfield";
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

const addChannelSettingsFlagsToChannelSettings = (channel_settings: ChannelSettings) => ({
  ...channel_settings,
  flags: bitfieldToChannelSettingsFlags(channel_settings.bitfield),
});

const z_channel_settings = z.object({
  channel_id: z.string(),
  bitfield: z.number(),
});

const z_channel_settings_update_input = z.object({
  flags: z.optional(z_channel_settings_flags),
});

const z_channel_settings_create_input = z.object({
  flags: z.optional(z_channel_settings_flags),
});

const channelSettingsCreateUpdate = router({
  create: publicProcedure
    .input(z.object({ channel: channel_upsert_input, data: z_channel_settings_create_input }))
    .mutation(async ({ ctx, input }) => {
      const channel = await channelRouter.createCaller(ctx).upsert(input.channel);
      const data = await ctx.prisma.channelSettings.create({
        data: {
          ...input.data,
          channel: {
            connect: {
              id: channel.id,
            },
          },
        },
      });
      return addChannelSettingsFlagsToChannelSettings(data);
    }),
  update: publicProcedure
    .input(
      z.object({
        update: z_channel_settings_update_input,
        old: z_channel_settings,
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log(input.update.flags);
      const data = await ctx.prisma.channelSettings.update({
        where: {
          channel_id: input.old.channel_id,
        },
        data: {
          bitfield: input.update.flags?.indexing_enabled ? 1 : 0, // TODO: implement bitfield
        },
      });
      return addChannelSettingsFlagsToChannelSettings(data);
    }),
});

const channelSettingFind = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const data = await ctx.prisma.channelSettings.findUnique({
      where: {
        channel_id: input,
      },
    });
    if (!data) return null;
    return addChannelSettingsFlagsToChannelSettings(data);
  }),
});

const channelSettingsUpsert = router({
  upsert: publicProcedure
    .input(z.object({ channel: channel_upsert_input, data: z_channel_settings_create_input }))
    .mutation(async ({ ctx, input }) => {
      const existing_channel_settings = await channelSettingFind
        .createCaller(ctx)
        .byId(input.channel.create.id);

      if (existing_channel_settings) {
        return channelSettingsCreateUpdate.createCaller(ctx).update({
          update: {
            ...input.data,
          },
          old: existing_channel_settings,
        });
      } else {
        return await channelSettingsCreateUpdate.createCaller(ctx).create({
          channel: input.channel,
          data: input.data,
        });
      }
    }),
});

export const channelSettingsRouter = mergeRouters(channelSettingsUpsert, channelSettingFind);
