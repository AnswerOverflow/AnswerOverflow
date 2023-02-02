import { prisma } from "..";
import {
  getDefaultChannel,
  getDefaultChannelSettings,
  getDefaultServerSettings,
  getDefaultUserServerSettings,
} from "./default";
import { getRandomId } from "@answeroverflow/utils";
describe("Default Channel Settings Values", () => {
  it("should verify channel settings default values are correct", async () => {
    const server_id = getRandomId();
    const channel_id = getRandomId();
    await prisma.server.create({
      data: {
        id: server_id,
        name: "test",
      },
    });
    await prisma.channel.create({
      data: {
        id: channel_id,
        name: "test",
        type: 0,
        server_id: server_id,
      },
    });
    const expected_defaults = await prisma.channelSettings.create({
      data: {
        channel_id: channel_id,
      },
    });
    const defaults = getDefaultChannelSettings({
      channel_id: channel_id,
    });
    expect(defaults).toEqual(expected_defaults);
  });
});

describe("Default Channel Values", () => {
  it("should verify channel default values are correct", async () => {
    const server_id = getRandomId();
    const channel_id = getRandomId();
    await prisma.server.create({
      data: {
        id: server_id,
        name: "test",
      },
    });
    const expected_defaults = await prisma.channel.create({
      data: {
        id: channel_id,
        name: "test",
        type: 0,
        server_id: server_id,
      },
    });
    const defaults = getDefaultChannel({
      id: channel_id,
      name: "test",
      type: 0,
      server_id: server_id,
      parent_id: null,
    });
    expect(defaults).toEqual(expected_defaults);
  });
});

describe("Default Server Settings Values", () => {
  it("should verify server settings default values are correct", async () => {
    const server_id = getRandomId();
    await prisma.server.create({
      data: {
        id: server_id,
        name: "test",
      },
    });
    const expected_defaults = await prisma.serverSettings.create({
      data: {
        server_id: server_id,
      },
    });
    const defaults = getDefaultServerSettings({
      server_id: server_id,
    });
    expect(defaults).toEqual(expected_defaults);
  });
});

describe("Default User Server Settings Values", () => {
  it("should verify user server settings default values are correct", async () => {
    const server_id = getRandomId();
    const user_id = getRandomId();
    await prisma.server.create({
      data: {
        id: server_id,
        name: "test",
      },
    });
    await prisma.discordAccount.create({
      data: {
        id: user_id,
        name: "test",
      },
    });
    const expected_defaults = await prisma.userServerSettings.create({
      data: {
        user_id,
        server_id,
      },
    });
    const defaults = getDefaultUserServerSettings({
      user_id,
      server_id,
    });
    expect(defaults).toEqual(expected_defaults);
  });
});
