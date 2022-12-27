import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { TRPCError } from "@trpc/server";
import { Channel, DMChannel, Events, GuildChannel, ThreadChannel } from "discord.js";
import { callAPI } from "~discord-bot/utils/trpc";

@ApplyOptions<Listener.Options>({ event: Events.ChannelUpdate, name: "Channel Sync On Update" })
export class SyncOnUpdate extends Listener {
  public async run(_oldChannel: DMChannel | GuildChannel, newChannel: DMChannel | GuildChannel) {
    if (newChannel.isDMBased()) return;
    await callAPI({
      async ApiCall(router) {
        return router.channels.update({
          id: newChannel.id,
          name: newChannel.name,
        });
      },
      Ok() {
        console.log("Updated channel", newChannel.id);
      },
      Error(error) {
        if (error instanceof TRPCError) {
          if (error.code === "NOT_FOUND") {
            // We don't have this channel in the database, so no need to do anything
            return;
          }
        } else {
          console.error(error);
        }
      },
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ChannelDelete, name: "Channel Sync On Delete" })
export class ChannelSyncOnDelete extends Listener {
  public async run(channel: Channel) {
    await callAPI({
      async ApiCall(router) {
        return router.channels.delete(channel.id);
      },
      Ok(result) {
        console.log("Deleted channel", channel.id, result);
      },
      Error(error) {
        if (error instanceof TRPCError) {
          if (error.code === "NOT_FOUND") {
            // We don't have this channel in the database, so no need to do anything
            return;
          }
        } else {
          console.error(error);
        }
      },
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadDelete, name: "Thread Sync On Delete" })
export class ThreadSyncOnDelete extends Listener {
  public async run(thread: ThreadChannel) {
    await callAPI({
      async ApiCall(router) {
        return router.channels.delete(thread.id);
      },
      Ok(result) {
        console.log("Deleted ", result, " messages from thread ", thread.id);
      },
      Error(error) {
        if (error instanceof TRPCError) {
          if (error.code === "NOT_FOUND") {
            // We don't have this channel in the database, so no need to do anything
            return;
          }
        } else {
          console.error(error);
        }
      },
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadUpdate, name: "Thread Sync On Update" })
export class ThreadSyncOnUpdate extends Listener {
  public async run(_oldThread: ThreadChannel, newThread: ThreadChannel) {
    await callAPI({
      async ApiCall(router) {
        return router.channels.update({
          id: newThread.id,
          name: newThread.name,
        });
      },
      Ok() {
        console.log("Updated thread", newThread.id);
      },
      Error(error) {
        if (error instanceof TRPCError) {
          if (error.code === "NOT_FOUND") {
            // We don't have this channel in the database, so no need to do anything
            return;
          }
        } else {
          console.error(error);
        }
      },
    });
  }
}
