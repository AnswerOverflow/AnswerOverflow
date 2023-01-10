import { clearDatabase } from "@answeroverflow/db";
import type { SapphireClient } from "@sapphire/framework";
import { Events, PublicThreadChannel, TextChannel } from "discord.js";
import {
  mockInvite,
  mockTextChannel,
  mockThreadChannel,
} from "~discord-bot/test/utils/discordjs/channel-mock";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { copyClass, emitEvent, testOnlyAPICall } from "~discord-bot/test/utils/helpers";
import { toAOChannelWithServer, toAOThread } from "~discord-bot/utils/conversions";

let data: Awaited<ReturnType<typeof setupBot>>;
let client: SapphireClient;
let text_channel: TextChannel;
let thread: PublicThreadChannel;
beforeEach(async () => {
  await clearDatabase();
  data = await setupBot();
  client = data.client;
  text_channel = mockTextChannel(client);
  thread = mockThreadChannel(client);
});

describe("Channel Update Parity", () => {
  it("should update an existing channel", async () => {
    await testOnlyAPICall((router) =>
      router.channels.createWithDeps(toAOChannelWithServer(text_channel))
    );

    const new_channel = copyClass(text_channel, client, { name: "new_name" });
    await emitEvent(client, Events.ChannelUpdate, text_channel, new_channel);

    const updated_channel = await testOnlyAPICall((router) => router.channels.byId(new_channel.id));
    expect(updated_channel!.name).toBe(new_channel.name);
  });
  it("should not update a channel that doesn't exist", async () => {
    const new_channel = copyClass(text_channel, client, { name: "new_name" });
    await emitEvent(client, Events.ChannelUpdate, text_channel, new_channel);
    const updated = await testOnlyAPICall((router) => router.channels.byId(new_channel.id));
    expect(updated).toBeNull();
  });
});

describe("Channel Delete Parity", () => {
  it("should delete an existing channel", async () => {
    await testOnlyAPICall((router) =>
      router.channels.createWithDeps(toAOChannelWithServer(text_channel))
    );
    await emitEvent(client, Events.ChannelDelete, text_channel);
    const deleted = await testOnlyAPICall((router) => router.channels.byId(text_channel.id));
    expect(deleted).toBeNull();
  });
  it("should not delete a channel that doesn't exist", async () => {
    await emitEvent(client, Events.ChannelDelete, text_channel);
    const deleted = await testOnlyAPICall((router) => router.channels.byId(text_channel.id));
    expect(deleted).toBeNull();
  });
});

describe("Thread Delete Parity", () => {
  it("should delete an existing thread", async () => {
    await testOnlyAPICall((router) =>
      router.channels.createThreadWithDeps({
        parent: toAOChannelWithServer(thread.parent!),
        ...toAOThread(thread),
      })
    );
    const created = await testOnlyAPICall((router) => router.channels.byId(thread.id));
    expect(created).not.toBeNull();
    await emitEvent(client, Events.ThreadDelete, thread);

    const deleted = await testOnlyAPICall((router) => router.channels.byId(thread.id));
    expect(deleted).toBeNull();
  });
});

describe("Thread Update Parity", () => {
  it("should update an existing thread", async () => {
    await testOnlyAPICall((router) =>
      router.channels.createThreadWithDeps({
        parent: toAOChannelWithServer(thread.parent!),
        ...toAOThread(thread),
      })
    );
    const new_thread = copyClass(thread, client, { name: "new_name" });

    await emitEvent(client, Events.ThreadUpdate, thread, new_thread);
    const updated = await testOnlyAPICall((router) => router.channels.byId(new_thread.id));

    expect(updated).not.toBeNull();
    expect(updated!.name).toBe(new_thread.name);
  });
  it("should not update a thread that doesn't exist", async () => {
    const new_thread = copyClass(thread, client, { name: "new_name" });
    await emitEvent(client, Events.ThreadUpdate, thread, new_thread);
    const updated = await testOnlyAPICall((router) => router.channels.byId(new_thread.id));
    expect(updated).toBeNull();
  });
});

describe("Invite Parity", () => {
  it("should sync delete of an invite", async () => {
    const settings = await testOnlyAPICall((router) =>
      router.channel_settings.createWithDeps({
        channel: toAOChannelWithServer(text_channel),
        invite_code: "1234",
      })
    );
    expect(settings).not.toBeNull();
    expect(settings!.invite_code).toBe("1234");
    const invite_mock = mockInvite(client, undefined, { code: settings!.invite_code! });
    await emitEvent(client, Events.InviteDelete, invite_mock);

    const updated = await testOnlyAPICall((router) =>
      router.channel_settings.byId(text_channel.id)
    );
    expect(updated!.invite_code).toBeNull();
  });
});
