import {
  z_unique_array,
  z_channel_public,
  findManyChannelsById,
  findChannelById,
  z_channel_create,
  createChannel,
  z_channel_update,
  updateChannel,
  deleteChannel,
  z_channel_create_with_deps,
  createChannelWithDeps,
  z_channel_upsert,
  z_channel_upsert_with_deps,
  z_thread_upsert_with_deps,
  upsert,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, router, publicProcedure } from "~api/router/trpc";
import {
  protectedFetchWithPublicData,
  protectedFetchManyWithPublicData,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";

export const CHANNEL_NOT_FOUND_MESSAGES = "Channel does not exist";

const channel_crud_router = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findChannelById(input),
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
      not_found_message: CHANNEL_NOT_FOUND_MESSAGES,
      public_data_formatter: (data) => {
        return z_channel_public.parse(data);
      },
    });
  }),
  byIdMany: publicProcedure.input(z_unique_array).query(async ({ ctx, input }) => {
    return protectedFetchManyWithPublicData({
      fetch: () => findManyChannelsById(input),
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
      public_data_formatter: (data) => z_channel_public.parse(data),
    });
  }),
  create: publicProcedure.input(z_channel_create).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => createChannel(input),
      permissions: () => assertCanEditServerBotOnly(ctx, input.server_id),
    });
  }),
  update: publicProcedure.input(z_channel_update).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findChannelById(input.id),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.server_id),
      operation: (old) => updateChannel(input, old),
      not_found_message: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
  delete: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findChannelById(input),
      operation: () => deleteChannel(input),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.server_id),
      not_found_message: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
});

const create_with_deps_router = router({
  createWithDeps: publicProcedure.input(z_channel_create_with_deps).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => createChannelWithDeps(input),
      permissions: () => assertCanEditServerBotOnly(ctx, input.server.id),
    });
  }),
});

const upsert_router = router({
  upsert: publicProcedure.input(z_channel_upsert).mutation(async ({ ctx, input }) => {
    return upsert({
      create: () => channel_crud_router.createCaller(ctx).create(input),
      update: () => channel_crud_router.createCaller(ctx).update(input),
      find: () => findChannelById(input.id),
    });
  }),
  upsertWithDeps: publicProcedure
    .input(z_channel_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert({
        find: () => findChannelById(input.id),
        create: () => create_with_deps_router.createCaller(ctx).createWithDeps(input),
        update: () => channel_crud_router.createCaller(ctx).update(input),
      });
    }),
});

const upsert_thread_router = router({
  upsertThreadWithDeps: publicProcedure
    .input(z_thread_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert({
        find: () => findChannelById(input.parent.id),
        create: async () => {
          await upsert_router.createCaller(ctx).upsertWithDeps(input.parent);
          return channel_crud_router.createCaller(ctx).create({
            parent_id: input.parent.id,
            server_id: input.parent.server.id,
            ...input,
          });
        },
        update: () => channel_crud_router.createCaller(ctx).update(input),
      });
    }),
});

export const channelRouter = mergeRouters(
  create_with_deps_router,
  upsert_thread_router,
  channel_crud_router,
  upsert_router
);
