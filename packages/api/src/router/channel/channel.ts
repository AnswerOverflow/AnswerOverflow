import { getDefaultChannel } from "@answeroverflow/db";
import { z } from "zod";
import { mergeRouters, withUserServersProcedure, router } from "~api/router/trpc";
import { addDefaultValues, upsert, upsertMany } from "~api/utils/operations";
import { assertCanEditServer, assertCanEditServers } from "~api/utils/permissions";
import {
  protectedFetch,
  protectedMutation,
  protectedMutationFetchFirst,
} from "~api/utils/protected-procedures/base";
import { ALLOWED_CHANNEL_TYPES, ALLOWED_THREAD_TYPES } from "~api/utils/types";
import { serverRouter, z_server_upsert } from "../server/server";

const z_channel = z.object({
  id: z.string(),
  name: z.string(),
  server_id: z.string(),
  type: z.number().refine(
    (n) => ALLOWED_CHANNEL_TYPES.has(n),
    "Channel type can only be guild forum, text, or announcement" // TODO: Make a type error if possible
  ),
  parent_id: z.string().nullable(),
});

const z_channel_required = z_channel.pick({
  id: true,
  name: true,
  server_id: true,
  type: true,
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
  byId: withUserServersProcedure.input(z.string()).query(async ({ ctx, input }) => {
    return protectedFetch({
      fetch: async () => await ctx.prisma.channel.findUnique({ where: { id: input } }),
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
      not_found_message: "Channel does not exist",
    });
  }),
  byIdMany: withUserServersProcedure.input(z.array(z.string())).query(async ({ ctx, input }) => {
    return protectedFetch({
      fetch: async () => await ctx.prisma.channel.findMany({ where: { id: { in: input } } }),
      permissions: (data) =>
        assertCanEditServers(
          ctx,
          data.map((c) => c.server_id)
        ),
      not_found_message: "Channel does not exist",
    });
  }),
});

const create_update_delete_router = router({
  create: withUserServersProcedure.input(z_channel_create).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => ctx.prisma.channel.create({ data: input }),
      permissions: () => assertCanEditServer(ctx, input.server_id),
    });
  }),
  createThread: withUserServersProcedure.input(z_thread_create).mutation(({ ctx, input }) => {
    return protectedMutation({
      operation: () => ctx.prisma.channel.create({ data: input }),
      permissions: () => assertCanEditServer(ctx, input.server_id),
    });
  }),
  createMany: withUserServersProcedure
    .input(z.array(z_channel_create))
    .mutation(async ({ ctx, input }) => {
      await protectedMutation({
        operation: () => ctx.prisma.channel.createMany({ data: input }),
        permissions: () =>
          assertCanEditServers(
            ctx,
            input.map((c) => c.server_id)
          ),
      });
      return addDefaultValues(input, getDefaultChannel);
    }),
  update: withUserServersProcedure.input(z_channel_update).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => fetch_router.createCaller(ctx).byId(input.id),
      operation: () => ctx.prisma.channel.update({ where: { id: input.id }, data: input }),
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
      not_found_message: "Channel does not exist",
    });
  }),
  updateMany: withUserServersProcedure
    .input(z.array(z_channel_update))
    .mutation(async ({ ctx, input }) => {
      return protectedMutationFetchFirst({
        fetch: () => fetch_router.createCaller(ctx).byIdMany(input.map((c) => c.id)),
        operation: () =>
          ctx.prisma.$transaction(
            input.map((c) => ctx.prisma.channel.update({ where: { id: c.id }, data: c }))
          ),
        permissions: (data) =>
          assertCanEditServers(
            ctx,
            data.map((c) => c.server_id)
          ),
        not_found_message: "Channel does not exist",
      });
    }),
  delete: withUserServersProcedure.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedMutationFetchFirst({
      fetch: () => fetch_router.createCaller(ctx).byId(input),
      operation: () => ctx.prisma.channel.delete({ where: { id: input } }),
      permissions: (data) => assertCanEditServer(ctx, data.server_id),
      not_found_message: "Channel does not exist",
    });
  }),
});

const create_with_deps_router = router({
  createWithDeps: withUserServersProcedure
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

const create_thread_with_deps_router = router({
  createThreadWithDeps: withUserServersProcedure
    .input(z_thread_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      const { parent, ...thread } = input;
      await upsert_router.createCaller(ctx).upsertWithDeps(input.parent);

      return create_update_delete_router.createCaller(ctx).createThread({
        parent_id: parent.id,
        server_id: parent.server.id,
        ...thread,
      });
    }),
});

const upsert_router = router({
  upsert: withUserServersProcedure.input(z_channel_upsert).mutation(async ({ ctx, input }) => {
    return upsert(
      () => fetch_router.createCaller(ctx).byId(input.id),
      () => create_update_delete_router.createCaller(ctx).create(input),
      () => create_update_delete_router.createCaller(ctx).update(input)
    );
  }),
  upsertMany: withUserServersProcedure
    .input(z_channel_upsert_many)
    .mutation(async ({ ctx, input }) => {
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

  upsertWithDeps: withUserServersProcedure
    .input(z_channel_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => fetch_router.createCaller(ctx).byId(input.id),
        () => create_with_deps_router.createCaller(ctx).createWithDeps(input),
        () => create_update_delete_router.createCaller(ctx).update(input)
      );
    }),
  upsertThreadWithDeps: withUserServersProcedure
    .input(z_thread_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => fetch_router.createCaller(ctx).byId(input.id),
        () => create_thread_with_deps_router.createCaller(ctx).createThreadWithDeps(input),
        () => create_update_delete_router.createCaller(ctx).update(input)
      );
    }),
});

export const channelRouter = mergeRouters(
  create_update_delete_router,
  create_thread_with_deps_router,
  create_with_deps_router,
  fetch_router,
  upsert_router
);
