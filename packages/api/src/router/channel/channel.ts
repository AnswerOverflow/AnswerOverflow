import {
  ALLOWED_THREAD_TYPES,
  getDefaultChannel,
  z_unique_array,
  z_channel,
  getDefaultChannelSettings,
  z_channel_public,
} from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, router, publicProcedure } from "~api/router/trpc";
import { addDefaultValues, findOrThrowNotFound, upsert, upsertMany } from "~api/utils/operations";
import {
  protectedFetchWithPublicData,
  protectedFetchManyWithPublicData,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures";
import { assertCanEditServer, assertCanEditServerBotOnly } from "~api/utils/permissions";
import { serverRouter, z_server_upsert } from "../server/server";
import { omit } from "@answeroverflow/utils";

export const CHANNEL_NOT_FOUND_MESSAGES = "Channel does not exist";

const z_channel_required = z_channel.pick({
  id: true,
  name: true,
  server_id: true,
  type: true,
  parent_id: true,
});

const z_channel_mutable = z_channel.pick({
  name: true,
});

const z_channel_create = z_channel_mutable.merge(z_channel_required);

const z_thread_create = z_channel_create.extend({
  parent_id: z.string(),
  type: z.number().refine((n) => ALLOWED_THREAD_TYPES.has(n), "Can only create public threads"), // TODO: Make a type error if possible
});

const z_channel_create_with_deps = z_channel_create
  .omit({
    server_id: true, // Taken from server
  })
  .extend({
    server: z_server_upsert,
  });

const z_channel_update = z_channel_mutable.merge(
  z_channel_required.pick({
    id: true,
  })
);

export const z_channel_upsert = z_channel_create;
export const z_channel_upsert_many = z.array(z_channel_upsert);
export const z_channel_upsert_with_deps = z_channel_create_with_deps;

const z_thread_create_with_deps = z_thread_create
  .omit({
    parent_id: true, // Taken from parent
    server_id: true, // Taken from parent
  })
  .extend({
    parent: z_channel_upsert_with_deps,
  });

const z_thread_upsert_with_deps = z_thread_create_with_deps;

const fetch_router = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetchWithPublicData({
      async fetch() {
        const channel = await findOrThrowNotFound(
          () =>
            ctx.prisma.channel.findUnique({
              where: { id: input },
              include: { channel_settings: true },
            }),
          CHANNEL_NOT_FOUND_MESSAGES
        );
        const channel_with_settings = {
          ...omit(channel, "channel_settings"),
          settings:
            channel.channel_settings ?? getDefaultChannelSettings({ channel_id: channel.id }),
        };

        return channel_with_settings;
      },
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
      not_found_message: CHANNEL_NOT_FOUND_MESSAGES,
      public_data_formatter: (data) => {
        return z_channel_public.parse(data);
      },
    });
  }),
  byIdMany: publicProcedure.input(z_unique_array).query(async ({ ctx, input }) => {
    return protectedFetchManyWithPublicData({
      async fetch() {
        const channels = await ctx.prisma.channel.findMany({
          where: { id: { in: input } },
          include: { channel_settings: true },
        });
        return channels.map((channel) => ({
          ...omit(channel, "channel_settings"),
          settings:
            channel.channel_settings ?? getDefaultChannelSettings({ channel_id: channel.id }),
        }));
      },
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
      public_data_formatter: (data) => z_channel_public.parse(data),
    });
  }),
});

const create_update_delete_router = router({
  create: publicProcedure.input(z_channel_create).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => ctx.prisma.channel.create({ data: input }),
      permissions: () => assertCanEditServerBotOnly(ctx, input.server_id),
    });
  }),
  createMany: publicProcedure.input(z.array(z_channel_create)).mutation(async ({ ctx, input }) => {
    await protectedMutation({
      operation: () => ctx.prisma.channel.createMany({ data: input }),
      permissions: () => input.map((i) => assertCanEditServerBotOnly(ctx, i.server_id)).flat(),
    });
    return addDefaultValues(input, getDefaultChannel);
  }),
  update: publicProcedure.input(z_channel_update).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => fetch_router.createCaller(ctx).byId(input.id),
      operation: () => ctx.prisma.channel.update({ where: { id: input.id }, data: input }),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.server_id),
      not_found_message: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
  updateMany: publicProcedure.input(z.array(z_channel_update)).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => fetch_router.createCaller(ctx).byIdMany(input.map((c) => c.id)),
      operation: () =>
        ctx.prisma.$transaction(
          input.map((c) => ctx.prisma.channel.update({ where: { id: c.id }, data: c }))
        ),
      permissions: (data) =>
        data.map((channel) => assertCanEditServerBotOnly(ctx, channel.server_id)).flat(),
      not_found_message: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
  delete: publicProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => fetch_router.createCaller(ctx).byId(input),
      operation: () => ctx.prisma.channel.delete({ where: { id: input } }),
      permissions: (data) => assertCanEditServerBotOnly(ctx, data.server_id),
      not_found_message: CHANNEL_NOT_FOUND_MESSAGES,
    });
  }),
});

const create_with_deps_router = router({
  createWithDeps: publicProcedure
    .input(z_channel_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      const { server, ...channel } = input;
      await serverRouter.createCaller(ctx).upsert(server);
      return await create_update_delete_router.createCaller(ctx).create({
        server_id: input.server.id,
        ...channel,
      });
    }),
});

const upsert_router = router({
  upsert: publicProcedure.input(z_channel_upsert).mutation(async ({ ctx, input }) => {
    return upsert(
      () => fetch_router.createCaller(ctx).byId(input.id),
      () => create_update_delete_router.createCaller(ctx).create(input),
      () => create_update_delete_router.createCaller(ctx).update(input)
    );
  }),
  upsertMany: publicProcedure.input(z_channel_upsert_many).mutation(async ({ ctx, input }) => {
    return upsertMany({
      input: input,
      find: () => fetch_router.createCaller(ctx).byIdMany(input.map((c) => c.id)),
      getInputId(input) {
        return input.id;
      },
      getFetchedDataId(input) {
        return input.id;
      },
      create: (create) => create_update_delete_router.createCaller(ctx).createMany(create),
      update: (update) => create_update_delete_router.createCaller(ctx).updateMany(update),
    });
  }),

  upsertWithDeps: publicProcedure
    .input(z_channel_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => fetch_router.createCaller(ctx).byId(input.id),
        () => create_with_deps_router.createCaller(ctx).createWithDeps(input),
        () => create_update_delete_router.createCaller(ctx).update(input)
      );
    }),
});

const upsert_thread_router = router({
  upsertThreadWithDeps: publicProcedure
    .input(z_thread_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => fetch_router.createCaller(ctx).byId(input.id),
        async () => {
          await upsert_router.createCaller(ctx).upsertWithDeps(input.parent);
          return create_update_delete_router
            .createCaller(ctx)
            .create({ ...input, parent_id: input.parent.id, server_id: input.parent.server.id });
        },
        () => create_update_delete_router.createCaller(ctx).update(input)
      );
    }),
});

export const channelRouter = mergeRouters(
  create_update_delete_router,
  create_with_deps_router,
  upsert_thread_router,
  fetch_router,
  upsert_router
);
