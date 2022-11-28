import { PrismaClient } from "@answeroverflow/db";
import { z } from "zod";
import { publicProcedure, router } from "../../trpc";
import { serverRouter, server_create_input } from "../server/server";
import { userRouter, user_create_input } from "../user/user";

function findById({
  prisma,
  input,
}: {
  prisma: PrismaClient;
  input: {
    user_id: string;
    server_id: string;
  };
}) {
  return prisma.userServerSettings.findUnique({
    where: {
      user_id_server_id: input,
    },
  });
}

export const userServerSettingsRouter = router({
  byId: publicProcedure
    .input(
      z.object({
        user_id: z.string(),
        server_id: z.string(),
      })
    )
    .query(({ ctx, input }) => {
      return findById({ prisma: ctx.prisma, input });
    }),

  upsert: publicProcedure
    .input(
      z.object({
        user: user_create_input,
        server: server_create_input,
        user_server_settings: z.object({
          flags: z.object({
            display_messages: z.optional(z.boolean()),
            disabled_indexing: z.optional(z.boolean()),
        })
      }),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user_server_settings_router = userServerSettingsRouter.createCaller(ctx);
      const current_settings = await user_server_settings_router.byId({ user_id: input.user.id, server_id: input.server.id });

      if(current_settings) {
        const data = await ctx.prisma.userServerSettings.update({
          where: {
            user_id_server_id: {
              user_id: input.user.id,
              server_id: input.server.id,
            },
          },
          data: {
            bitfield: 1,
          },
        });
        return data;
      }

      const user_router = userRouter.createCaller(ctx);
      const server_router = serverRouter.createCaller(ctx);
      await user_router.create(input.user);
      await server_router.create(input.server);
      const data = await ctx.prisma.userServerSettings.create({
        data: {
          user_id: input.user.id,
          server_id: input.server.id,
          bitfield: 0,
        }
      });
      return data;
    })
});
