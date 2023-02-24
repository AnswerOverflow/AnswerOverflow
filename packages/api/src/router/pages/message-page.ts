import { z } from "zod";
import { router, withUserServersProcedure } from "~api/router/trpc";
import {
  addAuthorsToMessages,
  addReferencesToMessages,
  findChannelById,
  findMessageById,
  findMessagesByChannelId,
  findServerById,
} from "@answeroverflow/db";
import { findOrThrowNotFound } from "~api/utils/operations";
import {
  stripPrivateChannelData,
  stripPrivateMessageData,
  stripPrivateServerData,
} from "~api/utils/permissions";
import { ChannelType } from "discord.js";

export const messagePageRouter = router({
  byId: withUserServersProcedure.input(z.string()).query(async ({ input, ctx }) => {
    // This is the message we're starting from
    const targetMessage = await findOrThrowNotFound(
      () => findMessageById(input),
      "Root message not found"
    );

    // Declare as const to make Typescript not yell at us when used in arrow functions
    const childThreadId = targetMessage.childThread;
    const parentChannelId = targetMessage.parentChannelId;
    const isThreadWithRootMessageInParentChannel = childThreadId !== null;
    const isMessageInThread = parentChannelId !== null;
    // TODO: These should maybe be a different error code

    const threadFetch = isThreadWithRootMessageInParentChannel
      ? findOrThrowNotFound(() => findChannelById(childThreadId), "Thread for message not found")
      : isMessageInThread
      ? findOrThrowNotFound(
          () => findChannelById(parentChannelId),
          "Parent channel for message not found"
        )
      : undefined;

    const serverFetch = findOrThrowNotFound(
      () => findServerById(targetMessage.serverId),
      "Server for message not found"
    );
    const parentChannelFetch = parentChannelId
      ? findOrThrowNotFound(
          () => findChannelById(parentChannelId),
          "Parent channel for message not found"
        )
      : findOrThrowNotFound(
          () => findChannelById(targetMessage.channelId),
          "Channel for message not found"
        );

    const messageFetch = isThreadWithRootMessageInParentChannel
      ? findMessagesByChannelId({
          channelId: childThreadId,
        })
      : isMessageInThread
      ? findMessagesByChannelId({
          channelId: targetMessage.channelId,
        })
      : findMessagesByChannelId({
          channelId: targetMessage.channelId,
          after: targetMessage.id,
          limit: 20,
        });

    const [thread, server, channel, messages, rootMessage] = await Promise.all([
      threadFetch,
      serverFetch,
      parentChannelFetch,
      messageFetch,
      isMessageInThread ? findMessageById(targetMessage.id) : undefined,
    ]);

    // We've collected all of the data, now we need to strip out the private info
    const messagesWithRefs = await addReferencesToMessages(
      isThreadWithRootMessageInParentChannel
        ? [targetMessage, ...messages]
        : isMessageInThread && rootMessage && channel.type !== ChannelType.GuildForum
        ? [rootMessage, ...messages]
        : messages
    );
    const messagesWithDiscordAccounts = await addAuthorsToMessages(messagesWithRefs);
    return {
      messages: messagesWithDiscordAccounts.map((message) =>
        stripPrivateMessageData(message, ctx.userServers)
      ),
      parentChannel: stripPrivateChannelData(channel),
      server: stripPrivateServerData(server),
      thread: thread ? stripPrivateChannelData(thread) : undefined,
    };
  }),
  search: withUserServersProcedure.input(z.string()).query(async () => {}),
});
