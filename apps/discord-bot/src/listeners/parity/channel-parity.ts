import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import { Channel, DMChannel, Events, GuildChannel, Invite, ThreadChannel } from "discord.js";
import {
  deleteChannel,
  findChannelSettingsByInviteCode,
  updateChannel,
  updateChannelSettings,
} from "@answeroverflow/db";
import { callDatabaseWithErrorHandler } from "@answeroverflow/db";

@ApplyOptions<Listener.Options>({ event: Events.ChannelUpdate, name: "Channel Sync On Update" })
export class SyncOnUpdate extends Listener {
  public async run(_oldChannel: DMChannel | GuildChannel, newChannel: DMChannel | GuildChannel) {
    if (newChannel.isDMBased()) return;
    await callDatabaseWithErrorHandler({
      operation: () => updateChannel({ id: newChannel.id, name: newChannel.name }),
      allowed_errors: "NOT_FOUND",
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ChannelDelete, name: "Channel Sync On Delete" })
export class ChannelSyncOnDelete extends Listener {
  public async run(channel: Channel) {
    await callDatabaseWithErrorHandler({
      operation: () => deleteChannel(channel.id),
      allowed_errors: "NOT_FOUND",
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadDelete, name: "Thread Sync On Delete" })
export class ThreadSyncOnDelete extends Listener {
  public async run(thread: ThreadChannel) {
    await callDatabaseWithErrorHandler({
      operation: () => deleteChannel(thread.id),
      allowed_errors: "NOT_FOUND",
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadUpdate, name: "Thread Sync On Update" })
export class ThreadSyncOnUpdate extends Listener {
  public async run(_oldThread: ThreadChannel, newThread: ThreadChannel) {
    await callDatabaseWithErrorHandler({
      operation: () => updateChannel({ id: newThread.id, name: newThread.name }),
      allowed_errors: "NOT_FOUND",
    });
  }
}

@ApplyOptions<Listener.Options>({ event: Events.InviteDelete, name: "Invite Sync On Delete" })
export class InviteSyncOnDelete extends Listener {
  public async run(invite: Invite) {
    await callDatabaseWithErrorHandler({
      operation: async () => {
        // TODO: Find a way to just make this an update where query
        // Currently done this way instead of reduce the number of places the channel can be updated
        const settings = await findChannelSettingsByInviteCode(invite.code);
        if (!settings) return;
        await updateChannelSettings(
          { channel_id: settings.channel_id, invite_code: null },
          settings
        );
      },
      allowed_errors: "NOT_FOUND",
    });
  }
}
