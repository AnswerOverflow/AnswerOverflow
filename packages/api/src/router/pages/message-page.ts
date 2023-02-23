import { z } from "zod";
import { router, publicProcedure } from "~api/router/trpc";
import {
  ChannelWithFlags,
  findChannelById,
  findMessageById,
  findMessagesByChannelId,
  findServerById,
  MessageWithDiscordAccount,
} from "@answeroverflow/db";
import { findOrThrowNotFound } from "~api/utils/operations";
import {
  stripPrivateChannelData,
  stripPrivateMessageData,
  stripPrivateServerData,
} from "~api/utils/permissions";

export const messagePageRouter = router({
  byId: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    // fetch the root message
    const rootMessage = await findOrThrowNotFound(
      () => findMessageById(input),
      "Root message not found"
    );

    // TODO: These should maybe be a different error code
    // fetch the channel and the server the message is in
    const parentChannelOrThreadFetch = await findOrThrowNotFound(
      () => findChannelById(rootMessage.channelId),
      "Channel for message not found"
    );
    const serverFetch = await findOrThrowNotFound(
      () => findServerById(parentChannelOrThreadFetch.serverId),
      "Server for message not found"
    );

    const [threadOrParentChannel, server] = await Promise.all([
      parentChannelOrThreadFetch,
      serverFetch,
    ]);

    let thread: ChannelWithFlags | undefined = undefined;
    let parentChannel: ChannelWithFlags = threadOrParentChannel;
    let messages: MessageWithDiscordAccount[];

    if (threadOrParentChannel.parentId) {
      thread = threadOrParentChannel;
      const parentId = threadOrParentChannel.parentId;
      const parentChannelFetch = findOrThrowNotFound(
        () => findChannelById(parentId),
        "Parent channel for thread not found"
      );

      const messageFetch = findMessagesByChannelId({
        channelId: thread.id,
      });
      [parentChannel, messages] = await Promise.all([parentChannelFetch, messageFetch]);
    } else {
      messages = await findMessagesByChannelId({
        channelId: parentChannel.id,
        after: rootMessage.id,
        limit: 20,
      });
    }

    // We've collected all of the data, now we need to strip out the private info

    return {
      messages: messages.map((message) => stripPrivateMessageData(message, ctx.userServers)),
      parentChannel: stripPrivateChannelData(parentChannel),
      server: stripPrivateServerData(server),
      thread: thread ? stripPrivateChannelData(thread) : undefined,
    };
  }),
  search: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {}),
});
