import { Channel, ChannelSettings, clearDatabase } from "@answeroverflow/db";
import type { SapphireClient } from "@sapphire/framework";
import { Events } from "discord.js";
import { mockInvite } from "~discord-bot/test/utils/discordjs/channel-mock";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { delay } from "~discord-bot/test/utils/helpers";
import { toChannelCreateWithDeps, toChannelUpsertWithDeps } from "~discord-bot/utils/conversions";
import { callAPI } from "~discord-bot/utils/trpc";

let data: Awaited<ReturnType<typeof createNormalScenario>>;
let client: SapphireClient;

beforeEach(async () => {
  await clearDatabase();
  data = await createNormalScenario();
  client = data.client;
});

describe("Channel Update Parity", () => {
  it("should update an existing channel", async () => {
    await callAPI({
      async ApiCall(router) {
        return router.channels.createWithDeps(toChannelCreateWithDeps(data.text_channel));
      },
    });
    const new_channel = Object.assign(data.text_channel, { name: "new_name" });
    client.emit(Events.ChannelUpdate, data.text_channel, new_channel);
    await delay();
    let updated: Channel | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(new_channel.id);
      },
      Ok(channel) {
        updated = channel;
      },
    });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe(new_channel.name);
  });
  it("should not update a channel that doesn't exist", async () => {
    const new_channel = Object.assign(data.text_channel, { name: "new_name" });
    client.emit(Events.ChannelUpdate, data.text_channel, new_channel);
    await delay();
    let updated: Channel | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(new_channel.id);
      },
      Ok(channel) {
        updated = channel;
      },
    });
    expect(updated).toBeNull();
  });
});

describe("Channel Delete Parity", () => {
  it("should delete an existing channel", async () => {
    await callAPI({
      async ApiCall(router) {
        return router.channels.createWithDeps(toChannelCreateWithDeps(data.text_channel));
      },
    });
    client.emit(Events.ChannelDelete, data.text_channel);
    await delay();
    let deleted: Channel | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(data.text_channel.id);
      },
      Ok(channel) {
        deleted = channel;
      },
    });
    expect(deleted).toBeNull();
  });
  it("should not delete a channel that doesn't exist", async () => {
    client.emit(Events.ChannelDelete, data.text_channel);
    await delay();
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(data.text_channel.id);
      },
      Ok(channel) {
        expect(channel).toBeNull();
      },
    });
  });
});

describe("Thread Delete Parity", () => {
  it("should delete an existing thread", async () => {
    await callAPI({
      async ApiCall(router) {
        return router.channels.createThreadWithDeps({
          parent: toChannelUpsertWithDeps(data.forum_channel),
          thread: {
            id: data.forum_thread.id,
            name: data.forum_thread.name,
            parent_id: data.forum_channel.id,
            type: data.forum_thread.type,
            server_id: data.forum_thread.guild.id,
          },
        });
      },
    });
    let created: Channel | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(data.forum_thread.id);
      },
      Ok(channel) {
        created = channel;
      },
    });
    expect(created).not.toBeNull();
    client.emit(Events.ThreadDelete, data.forum_thread);
    await delay();
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(data.forum_thread.id);
      },
      Ok(channel) {
        expect(channel).toBeNull();
      },
    });
  });
});

describe("Thread Update Parity", () => {
  it("should update an existing thread", async () => {
    await callAPI({
      async ApiCall(router) {
        return router.channels.createThreadWithDeps({
          parent: toChannelUpsertWithDeps(data.forum_channel),
          thread: {
            id: data.forum_thread.id,
            name: data.forum_thread.name,
            parent_id: data.forum_channel.id,
            type: data.forum_thread.type,
            server_id: data.forum_thread.guild.id,
          },
        });
      },
    });
    const new_thread = Object.assign(data.forum_thread, { name: "new_name" });
    client.emit(Events.ThreadUpdate, data.forum_thread, new_thread);
    await delay();
    let updated: Channel | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(new_thread.id);
      },
      Ok(channel) {
        updated = channel;
      },
    });
    expect(updated).not.toBeNull();
    expect(updated!.name).toBe(new_thread.name);
  });
  it("should not update a thread that doesn't exist", async () => {
    const new_thread = Object.assign(data.forum_thread, { name: "new_name" });
    client.emit(Events.ThreadUpdate, data.forum_thread, new_thread);
    await delay();
    let updated: Channel | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(new_thread.id);
      },
      Ok(channel) {
        updated = channel;
      },
    });
    expect(updated).toBeNull();
  });
});

describe("Invite Parity", () => {
  it("should sync delete of an invite", async () => {
    let settings: ChannelSettings | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channel_settings.createWithDeps({
          channel: toChannelUpsertWithDeps(data.text_channel),
          settings: {
            channel_id: data.text_channel.id,
            invite_code: "1234",
          },
        });
      },
      Ok(created) {
        settings = created;
      },
    });
    expect(settings).not.toBeNull();
    expect(settings!.invite_code).toBe("1234");
    const invite_mock = mockInvite(client, undefined, { code: settings!.invite_code! });
    client.emit(Events.InviteDelete, invite_mock);
    await delay();

    let updated_settings: ChannelSettings | null = null;
    await callAPI({
      async ApiCall(router) {
        return router.channel_settings.byId(data.text_channel.id);
      },
      Ok(updated) {
        updated_settings = updated;
      },
    });
    expect(updated_settings!.invite_code).toBeNull();
  });
});
