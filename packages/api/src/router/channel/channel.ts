import {
  zUniqueArray,
  zChannelPublic,
  findManyChannelsById,
  findChannelById,
  zChannelCreate,
  createChannel,
  zChannelUpdate,
  updateChannel,
  deleteChannel,
  zChannelCreateWithDeps,
  createChannelWithDeps,
  zChannelUpsert,
  zChannelUpsertWithDeps,
  zThreadUpsertWithDeps,
  upsert,
} from "@answeroverflow/db";
import { z } from "zod";
import { MergeRouters, router, publicProcedure } from "~api/router/trpc";
import {
  protectedFetchWithPublicData,
  protectedFetchManyWithPublicData,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";

export const CHANNEL_NOT_FOUND_MESSAGES = "Channel does not exist";

const channelCrudRouter = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      fetch: () => findChannelById(input),
      permissions: (data) => assertCanEditServer(ctx, data.serverId),
      notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
      publicDataFormatter: (data) => {
        return zChannelPublic.parse(data);
      },
    });
  }),
  byIdMany: publicProcedure.input(zUniqueArray).query(async ({ ctx, input }) => {
    return protectedFetchManyWithPublicData({
      fetch: () => findManyChannelsById(input),
      permissions: (data) => assertCanEditServer(ctx, data.serverId),
      publicDataFormatter: (data) => zChannelPublic.parse(data),
    });
  }),
  create: publicProcedure.input(zChannelCreate).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => createChannel(input),
      permissions: () => assertCanEditServerBotOnly(ctx, input.serverId),
    });
  }),
  update: publicProcedure.input(zChannelUpdate).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findChannelById(input.id),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.serverId),
      operation: (old) =>
        updateChannel({
          update: input,
          old,
        }),
      notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
  delete: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => findChannelById(input),
      operation: () => deleteChannel(input),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.serverId),
      notFoundMessage: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
});

const createWithDepsRouter = router({
  createWithDeps: publicProcedure.input(zChannelCreateWithDeps).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => createChannelWithDeps(input),
      permissions: () => assertCanEditServerBotOnly(ctx, input.server.create.id),
    });
  }),
});

const upsertRouter = router({
  upsert: publicProcedure.input(zChannelUpsert).mutation(async ({ ctx, input }) => {
    return upsert({
      create: () => channelCrudRouter.createCaller(ctx).create(input),
      update: () => channelCrudRouter.createCaller(ctx).update(input),
      find: () => findChannelById(input.id),
    });
  }),
  upsertWithDeps: publicProcedure.input(zChannelUpsertWithDeps).mutation(async ({ ctx, input }) => {
    return upsert({
      find: () => findChannelById(input.id),
      create: () => createWithDepsRouter.createCaller(ctx).createWithDeps(input),
      update: () => channelCrudRouter.createCaller(ctx).update(input),
    });
  }),
});

const upsertThreadRouter = router({
  upsertThreadWithDeps: publicProcedure
    .input(zThreadUpsertWithDeps)
    .mutation(async ({ ctx, input }) => {
      return upsert({
        find: () => findChannelById(input.parent.id),
        create: async () => {
          await upsertRouter.createCaller(ctx).upsertWithDeps(input.parent);
          return channelCrudRouter.createCaller(ctx).create({
            parentId: input.parent.id,
            serverId: input.parent.server.create.id,
            ...input,
          });
        },
        update: () => channelCrudRouter.createCaller(ctx).update(input),
      });
    }),
});

export const channelRouter = MergeRouters(
  createWithDepsRouter,
  upsertThreadRouter,
  channelCrudRouter,
  upsertRouter
);
