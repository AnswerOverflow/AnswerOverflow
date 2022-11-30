import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "../trpc";
import { channelRouter, channel_upsert_input } from "./channel";
const z_channel_settings = z.object({
  channel_id: z.string(),
  bitfield: z.number(),
});

const z_channel_settings_update_input = z.object({
  bitfield: z.optional(z.number()),
});

const z_channel_settings_create_input = z.object({
  bitfield: z.number(),
});

const channelSettingsCreateUpdate = router({
  create: publicProcedure
    .input(z.object({ channel: channel_upsert_input, data: z_channel_settings_create_input }))
    .mutation(async ({ ctx, input }) => {
      const channel = await channelRouter.createCaller(ctx).upsert(input.channel);
      return ctx.prisma.channelSettings.create({
        data: {
          ...input.data,
          channel: {
            connect: {
              id: channel.id,
            },
          },
        },
      });
    }),
  update: publicProcedure
    .input(
      z.object({
        update: z_channel_settings_update_input,
        old: z_channel_settings,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const data = await ctx.prisma.channelSettings.update({
        where: {
          channel_id: input.old.channel_id,
        },
        data: {
          ...input.update,
        },
      });
      return data;
    }),
});

const channelSettingFind = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return ctx.prisma.channelSettings.findUnique({
      where: {
        channel_id: input,
      },
    });
  }),
});

const channelSettingsUpsert = router({
  upsert: publicProcedure
    .input(z.object({ channel: channel_upsert_input, data: z_channel_settings_create_input }))
    .mutation(async ({ ctx, input }) => {
      const existing_channel_settings = await channelSettingFind
        .createCaller(ctx)
        .byId(input.channel.channel.create.id);

      if (existing_channel_settings) {
        return channelSettingsCreateUpdate.createCaller(ctx).update({
          update: {
            ...input.data,
          },
          old: existing_channel_settings,
        });
      } else {
        return channelSettingsCreateUpdate.createCaller(ctx).create({
          channel: input.channel,
          data: input.data,
        });
      }
    }),
});

export const channelSettingsRouter = mergeRouters(channelSettingsUpsert, channelSettingFind);
