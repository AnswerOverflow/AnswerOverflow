import type { SapphireClient } from "@sapphire/framework";
import { Events, PublicThreadChannel, TextChannel } from "discord.js";
import { toAOChannel, toAOServer, toAOThread } from "~discord-bot/utils/conversions";
import {
  mockTextChannel,
  mockPublicThread,
  copyClass,
  emitEvent,
  mockInvite,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createChannel,
  createChannelSettings,
  createServer,
  findChannelById,
  findChannelSettingsById,
} from "@answeroverflow/db";

let client: SapphireClient;
let text_channel: TextChannel;
let thread: PublicThreadChannel;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  text_channel = mockTextChannel(client);
  thread = mockPublicThread({ client, parent_channel: text_channel });
  await createServer(toAOServer(text_channel.guild));
});

describe("Channel Update Parity", () => {
  it("should update an existing channel", async () => {
    await createChannel(toAOChannel(text_channel));

    const new_channel = copyClass(text_channel, client, { name: "new_name" });
    await emitEvent(client, Events.ChannelUpdate, text_channel, new_channel);

    const updated_channel = await findChannelById(text_channel.id);
    expect(updated_channel!.name).toBe(new_channel.name);
  });
  it("should not update a channel that doesn't exist", async () => {
    const new_channel = copyClass(text_channel, client, { name: "new_name" });
    await emitEvent(client, Events.ChannelUpdate, text_channel, new_channel);
    const updated = await findChannelById(text_channel.id);
    expect(updated).toBeNull();
  });
});

describe("Channel Delete Parity", () => {
  it("should delete an existing channel", async () => {
    await createChannel(toAOChannel(text_channel));
    await emitEvent(client, Events.ChannelDelete, text_channel);
    const deleted = await findChannelById(text_channel.id);
    expect(deleted).toBeNull();
  });
  it("should not delete a channel that doesn't exist", async () => {
    await emitEvent(client, Events.ChannelDelete, text_channel);
    const deleted = await findChannelById(text_channel.id);
    expect(deleted).toBeNull();
  });
});

describe("Thread Delete Parity", () => {
  it("should delete an existing thread", async () => {
    await createChannel(toAOChannel(text_channel));
    await createChannel(toAOThread(thread));
    const created = await findChannelById(thread.id);
    expect(created).not.toBeNull();
    await emitEvent(client, Events.ThreadDelete, thread);
    const deleted = await findChannelById(thread.id);
    expect(deleted).toBeNull();
  });
});

describe("Thread Update Parity", () => {
  it("should update an existing thread", async () => {
    await createChannel(toAOChannel(text_channel));
    await createChannel(toAOThread(thread));
    const new_thread = copyClass(thread, client, { name: "new_name" });

    await emitEvent(client, Events.ThreadUpdate, thread, new_thread);
    const updated = await findChannelById(thread.id);

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe(new_thread.name);
  });
  it("should not update a thread that doesn't exist", async () => {
    const new_thread = copyClass(thread, client, { name: "new_name" });
    await emitEvent(client, Events.ThreadUpdate, thread, new_thread);
    const updated = await findChannelById(thread.id);
    expect(updated).toBeNull();
  });
});

describe("Invite Parity", () => {
  it("should sync delete of an invite", async () => {
    await createChannel(toAOChannel(text_channel));
    const settings = await createChannelSettings({
      channel_id: text_channel.id,
      invite_code: "1234",
    });
    expect(settings).not.toBeNull();
    expect(settings.invite_code).toBe("1234");
    const invite_mock = mockInvite(client, undefined, { code: settings.invite_code! });
    await emitEvent(client, Events.InviteDelete, invite_mock);

    const updated = await findChannelSettingsById(text_channel.id);
    expect(updated!.invite_code).toBeNull();
  });
});
