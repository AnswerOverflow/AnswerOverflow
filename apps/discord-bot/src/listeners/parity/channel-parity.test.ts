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
import { createChannel, createServer, findChannelById } from "@answeroverflow/db";

let client: SapphireClient;
let textChannel: TextChannel;
let thread: PublicThreadChannel;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  textChannel = mockTextChannel(client);
  thread = mockPublicThread({ client, parentChannel: textChannel });
  await createServer(toAOServer(textChannel.guild));
});

describe("Channel Update Parity", () => {
  it("should update an existing channel", async () => {
    await createChannel(toAOChannel(textChannel));

    const newChannel = copyClass(textChannel, client, { name: "newName" });
    await emitEvent(client, Events.ChannelUpdate, textChannel, newChannel);

    const updatedChannel = await findChannelById(textChannel.id);
    expect(updatedChannel!.name).toBe(newChannel.name);
  });
  it("should not update a channel that doesn't exist", async () => {
    const newChannel = copyClass(textChannel, client, { name: "newName" });
    await emitEvent(client, Events.ChannelUpdate, textChannel, newChannel);
    const updated = await findChannelById(textChannel.id);
    expect(updated).toBeNull();
  });
});

describe("Channel Delete Parity", () => {
  it("should delete an existing channel", async () => {
    await createChannel(toAOChannel(textChannel));
    await emitEvent(client, Events.ChannelDelete, textChannel);
    const deleted = await findChannelById(textChannel.id);
    expect(deleted).toBeNull();
  });
  it("should not delete a channel that doesn't exist", async () => {
    await emitEvent(client, Events.ChannelDelete, textChannel);
    const deleted = await findChannelById(textChannel.id);
    expect(deleted).toBeNull();
  });
});

describe("Thread Delete Parity", () => {
  it("should delete an existing thread", async () => {
    await createChannel(toAOChannel(textChannel));
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
    await createChannel(toAOChannel(textChannel));
    await createChannel(toAOThread(thread));
    const newThread = copyClass(thread, client, { name: "newName" });

    await emitEvent(client, Events.ThreadUpdate, thread, newThread);
    const updated = await findChannelById(thread.id);

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe(newThread.name);
  });
  it("should not update a thread that doesn't exist", async () => {
    const newThread = copyClass(thread, client, { name: "newName" });
    await emitEvent(client, Events.ThreadUpdate, thread, newThread);
    const updated = await findChannelById(thread.id);
    expect(updated).toBeNull();
  });
});

describe("Invite Parity", () => {
  it("should sync delete of an invite", async () => {
    const settings = await createChannel({
      ...toAOChannel(textChannel),
      inviteCode: "1234",
    });
    expect(settings).not.toBeNull();
    expect(settings.inviteCode).toBe("1234");
    const inviteMock = mockInvite(client, undefined, { code: settings.inviteCode! });
    await emitEvent(client, Events.InviteDelete, inviteMock);

    const updated = await findChannelById(textChannel.id);
    expect(updated!.inviteCode).toBeNull();
  });
});
