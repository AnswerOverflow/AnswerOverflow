import { initTRPC } from "@trpc/server";
import { ChannelType } from "discord-api-types/v10";
import superjson from "superjson";
import { z } from "zod";
import { Client } from "discord.js";
// eslint-disable-next-line @typescript-eslint/ban-types
type BotContext = {
  client: Client;
};

const t = initTRPC.context<BotContext>().create({
  transformer: superjson,
  errorFormatter({ shape }) {
    return shape;
  },
  defaultMeta: {
    tenantAuthAccessible: false,
  },
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const botRouter = router({
  getTags: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    console.log("getTags", input);
    const channel = await ctx.client.channels.fetch(input);
    if (!channel || channel.type !== ChannelType.GuildForum) {
      return null;
    }
    return channel.availableTags;
  }),
});

export type BotRouter = typeof botRouter;
