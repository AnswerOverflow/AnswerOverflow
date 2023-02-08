import { z } from "zod";
import { router, publicProcedure } from "~api/router/trpc";
import { messageRouter } from "../message/message";
import { serverRouter } from "../server/server";
import { channelRouter } from "../channel/channel";
import type { ChannelPublicWithFlags } from "../channel/types";
import type { MessageWithDiscordAccount } from "@answeroverflow/db";

export const message_page_router = router({
  byId: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    // fetch the root message
    const root_message = await messageRouter.createCaller(ctx).byId(input);

    // fetch the channel and the server the message is in
    const parent_channel_or_thread_fetch = channelRouter
      .createCaller(ctx)
      .byId(root_message.channel_id);
    const server_fetch = serverRouter.createCaller(ctx).byId(root_message.server_id);

    const [thread_or_parent_channel, server] = await Promise.all([
      parent_channel_or_thread_fetch,
      server_fetch,
    ]);

    let thread: ChannelPublicWithFlags | undefined = undefined;
    let parent_channel: ChannelPublicWithFlags = thread_or_parent_channel;
    let messages: MessageWithDiscordAccount[];

    if (thread_or_parent_channel.parent_id) {
      thread = thread_or_parent_channel;
      const parent_channel_fetch = channelRouter
        .createCaller(ctx)
        .byId(thread_or_parent_channel.parent_id);
      const message_fetch = messageRouter.createCaller(ctx).byChannelIdBulk({
        channel_id: thread.id,
      });
      [parent_channel, messages] = await Promise.all([parent_channel_fetch, message_fetch]);
    } else {
      messages = await messageRouter.createCaller(ctx).byChannelIdBulk({
        channel_id: parent_channel.id,
        after: root_message.id,
        limit: 20,
      });
    }

    return {
      messages,
      parent_channel,
      server,
      thread,
    };
  }),
});
