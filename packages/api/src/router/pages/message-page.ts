import { z } from "zod";
import { router, publicProcedure } from "~api/router/trpc";
import { messageRouter } from "../message/message";
import { serverRouter } from "../server/server";
import { channelRouter } from "../channel/channel";
import type { ChannelPublicWithFlags } from "../channel/types";
import type { MessageWithDiscordAccount } from "@answeroverflow/db";

export const messagePageRouter = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    // fetch the root message
    const rootMessage = await messageRouter.createCaller(ctx).byId(input);

    // fetch the channel and the server the message is in
    const parentChannelOrThreadFetch = channelRouter.createCaller(ctx).byId(rootMessage.channelId);
    const serverFetch = serverRouter.createCaller(ctx).byId(rootMessage.serverId);

    const [threadOrParentChannel, server] = await Promise.all([
      parentChannelOrThreadFetch,
      serverFetch,
    ]);

    let thread: ChannelPublicWithFlags | undefined = undefined;
    let parentChannel: ChannelPublicWithFlags = threadOrParentChannel;
    let messages: MessageWithDiscordAccount[];

    if (threadOrParentChannel.parentId) {
      thread = threadOrParentChannel;
      const parentChannelFetch = channelRouter
        .createCaller(ctx)
        .byId(threadOrParentChannel.parentId);
      const messageFetch = messageRouter.createCaller(ctx).byChannelIdBulk({
        channelId: thread.id,
      });
      [parentChannel, messages] = await Promise.all([parentChannelFetch, messageFetch]);
    } else {
      messages = await messageRouter.createCaller(ctx).byChannelIdBulk({
        channelId: parentChannel.id,
        after: rootMessage.id,
        limit: 20,
      });
    }

    return {
      messages,
      parentChannel,
      server,
      thread,
    };
  }),
});
