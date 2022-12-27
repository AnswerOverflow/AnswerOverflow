import { clearDatabase } from "@answeroverflow/db";
import type { SapphireClient } from "@sapphire/framework";
import { Events } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { delay } from "~discord-bot/test/utils/helpers";
import { toChannelCreateWithDeps } from "~discord-bot/utils/conversions";
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
      Ok() {},
      Error() {},
    });
    const new_channel = Object.assign(data.text_channel, { name: "new_name" });
    client.emit(Events.ChannelUpdate, data.text_channel, new_channel);
    await delay();
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(new_channel.id);
      },
      Ok(channel) {
        expect(channel!.name).toBe(new_channel.name);
      },
      Error() {},
    });
  });
  it("should not update a channel that doesn't exist", async () => {
    const new_channel = Object.assign(data.text_channel, { name: "new_name" });
    client.emit(Events.ChannelUpdate, data.text_channel, new_channel);
    await delay();
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(new_channel.id);
      },
      Ok(channel) {
        expect(channel).toBeNull();
      },
      Error() {},
    });
  });
});

describe("Channel Delete Parity", () => {
  it("should delete an existing channel", async () => {
    await callAPI({
      async ApiCall(router) {
        return router.channels.createWithDeps(toChannelCreateWithDeps(data.text_channel));
      },
      Ok() {},
      Error() {},
    });
    client.emit(Events.ChannelDelete, data.text_channel);
    await delay();
    await callAPI({
      async ApiCall(router) {
        return router.channels.byId(data.text_channel.id);
      },
      Ok(channel) {
        expect(channel).toBeNull();
      },
      Error() {},
    });
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
      Error() {},
    });
  });
});

describe("Thread Delete Parity", () => {
  it("should delete an existing thread", async () => {
    await callAPI({
      async ApiCall(router) {
        return router.channels.createWithDeps(toChannelCreateWithDeps(data.));
      },
      Ok() {},
      Error() {},
    });
    client.emit(Events.ThreadDelete, data.thread_channel);
    await delay();
  });
});
