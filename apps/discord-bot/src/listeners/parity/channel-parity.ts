import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Channel, DMChannel, Events, GuildChannel, Invite, ThreadChannel } from "discord.js";
import { createAnswerOveflowBotCtx } from "~discord-bot/utils/context";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";

@ApplyOptions<Listener.Options>({ event: Events.ChannelUpdate, name: "Channel Sync On Update" })
export class SyncOnUpdate extends Listener {
  public async run(_oldChannel: DMChannel | GuildChannel, newChannel: DMChannel | GuildChannel) {
    if (newChannel.isDMBased()) return;
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return router.channels.update({
          id: newChannel.id,
          name: newChannel.name,
        });
      },
      error_message: `Error updating channel: ${newChannel.id}`,
      success_message: `Updated channel: ${newChannel.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ChannelDelete, name: "Channel Sync On Delete" })
export class ChannelSyncOnDelete extends Listener {
  public async run(channel: Channel) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return router.channels.delete(channel.id);
      },
      error_message: `Error deleting channel: ${channel.id}`,
      success_message: `Deleted channel: ${channel.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadDelete, name: "Thread Sync On Delete" })
export class ThreadSyncOnDelete extends Listener {
  public async run(thread: ThreadChannel) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return router.channels.delete(thread.id);
      },
      error_message: `Error deleting thread: ${thread.id}`,
      success_message: `Deleted thread: ${thread.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadUpdate, name: "Thread Sync On Update" })
export class ThreadSyncOnUpdate extends Listener {
  public async run(_oldThread: ThreadChannel, newThread: ThreadChannel) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        return router.channels.update({
          id: newThread.id,
          name: newThread.name,
        });
      },
      error_message: `Error updating thread: ${newThread.id}`,
      success_message: `Updated thread: ${newThread.id}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.InviteDelete, name: "Invite Sync On Delete" })
export class InviteSyncOnDelete extends Listener {
  public async run(invite: Invite) {
    await callApiWithConsoleStatusHandler({
      async ApiCall(router) {
        const to_update = await router.channel_settings.byInviteCode(invite.code);
        if (!to_update) return;
        return router.channel_settings.update({
          channel_id: to_update.channel_id,
          invite_code: null,
        });
      },
      error_message: `Error deleting invite: ${invite.code}`,
      success_message: `Deleted invite: ${invite.code}`,
      getCtx: createAnswerOveflowBotCtx,
    });
  }
}
