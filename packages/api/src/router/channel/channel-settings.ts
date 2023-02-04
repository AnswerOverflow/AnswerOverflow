import {
  createChannelSettings,
  findChannelById,
  findChannelSettingsById,
  findChannelSettingsByInviteCode,
  updateChannelSettings,
  z_channel_settings_create,
  z_channel_settings_create_with_deps,
  z_channel_settings_update,
  z_channel_settings_upsert,
  z_channel_settings_upsert_with_deps,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, publicProcedure, router } from "~api/router/trpc";
import { channelRouter } from "./channel";
import { upsert } from "~api/utils/operations";
import { protectedFetch, protectedMutationFetchFirst } from "~api/utils/protected-procedures";
import { assertCanEditServerBotOnly, assertCanEditServer } from "~api/utils/permissions";

const channel_settings_crud = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetch({
      fetch: () => findChannelSettingsById(input, ctx.prisma),
      permissions: (data) => assertCanEditServer(ctx, data.channel.server_id),
      not_found_message: "Channel settings not found",
    });
  }),
  byInviteCode: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetch({
      fetch: () => findChannelSettingsByInviteCode(input, ctx.prisma),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.channel.server_id),
      not_found_message: "Channel settings not found",
    });
  }),
  create: publicProcedure.input(z_channel_settings_create).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findChannelById(input.channel_id, ctx.prisma),
      operation: () => createChannelSettings(input, ctx.prisma),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.server_id),
      not_found_message: "Channel not found",
    });
  }),
  update: publicProcedure.input(z_channel_settings_update).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findChannelSettingsById(input.channel_id, ctx.prisma),
      not_found_message: "Channel settings not found",
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.channel.server_id),
      operation: (existing_settings) => updateChannelSettings(input, ctx.prisma, existing_settings),
    });
  }),
});

const channel_settings_create_with_deps = router({
  createWithDeps: publicProcedure
    .input(z_channel_settings_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      const { channel, ...settings } = input;
      await channelRouter.createCaller(ctx).upsertWithDeps(channel);
      return channel_settings_crud
        .createCaller(ctx)
        .create({ channel_id: channel.id, ...settings });
    }),
});

const channel_settings_upsert = router({
  upsert: publicProcedure.input(z_channel_settings_upsert).mutation(async ({ ctx, input }) => {
    return upsert(
      () => findChannelSettingsById(input.channel_id, ctx.prisma),
      () => channel_settings_crud.createCaller(ctx).create(input),
      () => channel_settings_crud.createCaller(ctx).update(input)
    );
  }),
  upsertWithDeps: publicProcedure
    .input(z_channel_settings_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => findChannelSettingsById(input.channel.id, ctx.prisma),
        () => channel_settings_create_with_deps.createCaller(ctx).createWithDeps(input),
        () =>
          channel_settings_crud.createCaller(ctx).update({ channel_id: input.channel.id, ...input })
      );
    }),
});

export const channelSettingsRouter = mergeRouters(
  channel_settings_upsert,
  channel_settings_crud,
  channel_settings_create_with_deps
);
