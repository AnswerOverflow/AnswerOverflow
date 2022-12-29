import { Channel, getDefaultChannel, Server, Thread } from "@answeroverflow/db";
import { inferRouterInputs, TRPCError } from "@trpc/server";
import { z } from "zod";
import { mergeRouters, protectedProcedureWithUserServers, router } from "~api/router/trpc";
import { addDefaultValues, upsert, upsertMany } from "~api/utils/operations";

import {
  protectedServerManagerFetch,
  protectedServerManagerMutation,
  protectedServerManagerMutationFetchFirst,
} from "~api/utils/protected-procedures/server-manager-procedures";
import { ALLOWED_CHANNEL_TYPES, ALLOWED_THREAD_TYPES } from "~api/utils/types";
import { makeServerUpsert, serverRouter, z_server_upsert } from "../server/server";

const z_channel_create = z.object({
  id: z.string(),
  name: z.string(),
  server_id: z.string(),
  type: z
    .number()
    .refine(
      (n) => ALLOWED_CHANNEL_TYPES.has(n),
      "Channel type can only be guild forum, text, or announcement"
    ), // TODO: Make a type error if possible
});

const z_thread_create = z_channel_create.extend({
  parent_id: z.string(),
  type: z.number().refine((n) => ALLOWED_THREAD_TYPES.has(n), "Can only create public threads"), // TODO: Make a type error if possible
});

const z_channel_create_with_deps = z.object({
  channel: z_channel_create,
  server: z_server_upsert,
});

const z_channel_mutable = z_channel_create
  .omit({ id: true, type: true, server_id: true })
  .partial();
const z_channel_update = z.object({ id: z.string(), data: z_channel_mutable });

export const z_channel_upsert = z.object({ create: z_channel_create, update: z_channel_update });
export const z_channel_upsert_many = z.array(z_channel_upsert);
export const z_channel_upsert_with_deps = z.object({
  create: z_channel_create_with_deps,
  update: z_channel_update,
});

const z_thread_create_with_deps = z.object({
  thread: z_thread_create,
  parent: z_channel_upsert_with_deps,
});

const z_thread_upsert_with_deps = z.object({
  create: z_thread_create_with_deps,
  update: z_channel_update,
});

const create_update_delete_router = router({
  create: protectedProcedureWithUserServers.input(z_channel_create).mutation(({ ctx, input }) => {
    return protectedServerManagerMutation({
      operation: () => ctx.prisma.channel.create({ data: input }),
      server_id: input.server_id,
      ctx,
    });
  }),
  createThread: protectedProcedureWithUserServers
    .input(z_thread_create)
    .mutation(({ ctx, input }) => {
      return protectedServerManagerMutation({
        operation: () => ctx.prisma.channel.create({ data: input }),
        server_id: input.server_id,
        ctx,
      });
    }),
  createMany: protectedProcedureWithUserServers
    .input(z.array(z_channel_create))
    .mutation(async ({ ctx, input }) => {
      await protectedServerManagerMutation({
        operation: () => ctx.prisma.channel.createMany({ data: input }),
        server_id: input.map((c) => c.server_id),
        ctx,
      });
      return addDefaultValues(input, getDefaultChannel);
    }),
  update: protectedProcedureWithUserServers
    .input(z_channel_update)
    .mutation(async ({ ctx, input }) => {
      return protectedServerManagerMutationFetchFirst({
        fetch: () => fetch_router.createCaller(ctx).byId(input.id),
        operation: () => ctx.prisma.channel.update({ where: { id: input.id }, data: input.data }),
        getServerId: (data) => data.server_id,
        ctx,
        not_found_message: "Channel does not exist",
      });
    }),
  updateMany: protectedProcedureWithUserServers
    .input(z.array(z_channel_update))
    .mutation(async ({ ctx, input }) => {
      return protectedServerManagerMutationFetchFirst({
        fetch: () => fetch_router.createCaller(ctx).byIdMany(input.map((c) => c.id)),
        operation: () =>
          ctx.prisma.$transaction(
            input.map((c) => ctx.prisma.channel.update({ where: { id: c.id }, data: c }))
          ),
        getServerId: (data) => data.map((c) => c.server_id),
        ctx,
        not_found_message: "Channel does not exist",
      });
    }),
  delete: protectedProcedureWithUserServers.input(z.string()).mutation(async ({ ctx, input }) => {
    return protectedServerManagerMutationFetchFirst({
      fetch: () => fetch_router.createCaller(ctx).byId(input),
      operation: () => ctx.prisma.channel.delete({ where: { id: input } }),
      getServerId: (data) => data.server_id,
      ctx,
      not_found_message: "Channel does not exist",
    });
  }),
});

const fetch_router = router({
  byId: protectedProcedureWithUserServers.input(z.string()).query(async ({ ctx, input }) => {
    return protectedServerManagerFetch({
      fetch: async () => {
        const channel = await ctx.prisma.channel.findUnique({ where: { id: input } });
        if (!channel) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Channel does not exist",
          });
        }
        return channel;
      },
      getServerId: (data) => data.server_id,
      ctx,
      not_found_message: "Channel does not exist",
    });
  }),
  byIdMany: protectedProcedureWithUserServers
    .input(z.array(z.string()))
    .query(async ({ ctx, input }) => {
      return protectedServerManagerFetch({
        fetch: async () => {
          return await ctx.prisma.channel.findMany({ where: { id: { in: input } } });
        },
        getServerId(data) {
          return data.map((c) => c.server_id);
        },
        ctx,
        not_found_message: "Channel does not exist",
      });
    }),
});

const create_with_deps_router = router({
  createWithDeps: protectedProcedureWithUserServers
    .input(z_channel_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await serverRouter.createCaller(ctx).upsert(input.server);
      return await create_update_delete_router.createCaller(ctx).create(input.channel);
    }),
});

const create_thread_with_deps_router = router({
  createThreadWithDeps: protectedProcedureWithUserServers
    .input(z_thread_create_with_deps)
    .mutation(async ({ ctx, input }) => {
      await upsert_router.createCaller(ctx).upsertWithDeps(input.parent);
      return create_update_delete_router.createCaller(ctx).createThread(input.thread);
    }),
});

const upsert_router = router({
  upsert: protectedProcedureWithUserServers
    .input(z_channel_upsert)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => fetch_router.createCaller(ctx).byId(input.create.id),
        () => create_update_delete_router.createCaller(ctx).create(input.create),
        () => create_update_delete_router.createCaller(ctx).update(input.update)
      );
    }),
  upsertMany: protectedProcedureWithUserServers
    .input(z_channel_upsert_many)
    .mutation(async ({ ctx, input }) => {
      return upsertMany({
        find: () => fetch_router.createCaller(ctx).byIdMany(input.map((c) => c.create.id)),
        getToCreate: (existing) =>
          input.map((c) => c.create).filter((c) => !existing.map((e) => e.id).includes(c.id)),
        getToUpdate: (existing) =>
          input.map((c) => c.update).filter((c) => existing.map((e) => e.id).includes(c.id)),
        create: (create) => create_update_delete_router.createCaller(ctx).createMany(create),
        update: (update) => create_update_delete_router.createCaller(ctx).updateMany(update),
      });
    }),

  upsertWithDeps: protectedProcedureWithUserServers
    .input(z_channel_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => fetch_router.createCaller(ctx).byId(input.create.channel.id),
        () => create_with_deps_router.createCaller(ctx).createWithDeps(input.create),
        () => create_update_delete_router.createCaller(ctx).update(input.update)
      );
    }),
  upsertThreadWithDeps: protectedProcedureWithUserServers
    .input(z_thread_upsert_with_deps)
    .mutation(async ({ ctx, input }) => {
      return upsert(
        () => fetch_router.createCaller(ctx).byId(input.create.thread.id),
        () => create_thread_with_deps_router.createCaller(ctx).createThreadWithDeps(input.create),
        () => create_update_delete_router.createCaller(ctx).update(input.update)
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

export function makeChannelUpsert(
  channel: Channel,
  update: z.infer<typeof z_channel_mutable> | undefined = undefined
): inferRouterInputs<typeof upsert_router>["upsert"] {
  return {
    create: channel,
    update: { id: channel.id, data: update ?? channel },
  };
}

export function makeChannelCreateWithDepsInput(
  channel: Channel,
  server: Server
): inferRouterInputs<typeof create_with_deps_router>["createWithDeps"] {
  return {
    channel,
    server: makeServerUpsert(server),
  };
}

export function makeChannelUpsertWithDeps(
  channel: Channel,
  server: Server,
  update: z.infer<typeof z_channel_mutable> | undefined = undefined
): inferRouterInputs<typeof upsert_router>["upsertWithDeps"] {
  return {
    create: makeChannelCreateWithDepsInput(channel, server),
    update: { id: channel.id, data: update ?? channel },
  };
}

export function makeThreadUpsertWithDeps(
  thread: Thread,
  parent: Channel,
  server: Server
): inferRouterInputs<typeof upsert_router>["upsertThreadWithDeps"] {
  return {
    create: {
      thread,
      parent: makeChannelUpsertWithDeps(parent, server),
    },
    update: {
      id: thread.id,
      data: {
        name: "new name",
      },
    },
  };
}
