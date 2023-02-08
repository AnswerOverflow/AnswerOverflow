import { ApplyOptions } from "@sapphire/decorators";
import { Listener } from "@sapphire/framework";
import {
  Channel,
  ChannelType,
  DMChannel,
  Events,
  GuildChannel,
  Invite,
  ThreadChannel,
} from "discord.js";
import {
  deleteChannel,
  findChannelById,
  findChannelByInviteCode,
  updateChannel,
} from "@answeroverflow/db";

@ApplyOptions<Listener.Options>({ event: Events.ChannelUpdate, name: "Channel Sync On Update" })
export class SyncOnUpdate extends Listener {
  public async run(_oldChannel: DMChannel | GuildChannel, newChannel: DMChannel | GuildChannel) {
    if (newChannel.type === ChannelType.DM) return;
    const chnl = await findChannelById(newChannel.id);
    if (!chnl) return;

    await updateChannel({ id: newChannel.id, name: newChannel.name }, chnl);
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ChannelDelete, name: "Channel Sync On Delete" })
export class ChannelSyncOnDelete extends Listener {
  public async run(channel: Channel) {
    const chnl = await findChannelById(channel.id);
    if (!chnl) return;
    await deleteChannel(channel.id);
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadDelete, name: "Thread Sync On Delete" })
export class ThreadSyncOnDelete extends Listener {
  public async run(thread: ThreadChannel) {
    const chnl = await findChannelById(thread.id);
    if (!chnl) return;
    await deleteChannel(thread.id);
  }
}

@ApplyOptions<Listener.Options>({ event: Events.ThreadUpdate, name: "Thread Sync On Update" })
export class ThreadSyncOnUpdate extends Listener {
  public async run(_oldThread: ThreadChannel, newThread: ThreadChannel) {
    const chnl = await findChannelById(newThread.id);
    if (!chnl) return;
    await updateChannel({ id: newThread.id, name: newThread.name }, chnl);
  }
}

@ApplyOptions<Listener.Options>({ event: Events.InviteDelete, name: "Invite Sync On Delete" })
export class InviteSyncOnDelete extends Listener {
  public async run(invite: Invite) {
    const settings = await findChannelByInviteCode(invite.code);
    if (!settings) return;
    await updateChannel({ id: settings.id, invite_code: null }, settings);
  }
}
