import { prisma } from "..";
import {
  getDefaultChannel,
  getDefaultChannelSettings,
  getDefaultChannelSettingsWithFlags,
  getDefaultServerSettings,
  getDefaultThread,
  getDefaultUserServerSettings,
} from "./default";
import { clearDatabase } from "./utils";

beforeEach(async () => {
  await clearDatabase();
});

describe("Default Channel Settings Values", () => {
  it("should verify channel settings default values are correct", async () => {
    await prisma.server.create({
      data: {
        id: "100",
        name: "test",
      },
    });
    await prisma.channel.create({
      data: {
        id: "123",
        name: "test",
        type: 0,
        server_id: "100",
      },
    });
    const expected_defaults = await prisma.channelSettings.create({
      data: {
        channel_id: "123",
      },
    });
    const defaults = getDefaultChannelSettings("123");
    expect(defaults).toEqual(expected_defaults);
  });
  it("should verify channel settings with flags are correct", async () => {
    await prisma.server.create({
      data: {
        id: "100",
        name: "test",
      },
    });
    await prisma.channel.create({
      data: {
        id: "123",
        name: "test",
        type: 0,
        server_id: "100",
      },
    });
    const expected_defaults = await prisma.channelSettings.create({
      data: {
        channel_id: "123",
      },
    });
    const defaults = getDefaultChannelSettingsWithFlags("123");
    const { flags, ...expected_defaults_without_flags } = defaults;
    expect(expected_defaults_without_flags).toEqual(expected_defaults);
    expect(flags.auto_thread_enabled).toBeDefined();
    expect(flags).toBeDefined();
  });
});

describe("Default Channel Values", () => {
  it("should verify channel default values are correct", async () => {
    await prisma.server.create({
      data: {
        id: "100",
        name: "test",
      },
    });
    const expected_defaults = await prisma.channel.create({
      data: {
        id: "123",
        name: "test",
        type: 0,
        server_id: "100",
      },
    });
    const defaults = getDefaultChannel({
      id: "123",
      name: "test",
      type: 0,
      server_id: "100",
    });
    expect(defaults).toEqual(expected_defaults);
  });
  it("should verify thread default values are correct", async () => {
    await prisma.server.create({
      data: {
        id: "100",
        name: "test",
      },
    });
    await prisma.channel.create({
      data: {
        id: "123",
        name: "test",
        type: 0,
        server_id: "100",
      },
    });
    const expected_defaults = await prisma.channel.create({
      data: {
        id: "456",
        name: "test",
        type: 1,
        server_id: "100",
        parent_id: "123",
      },
    });
    const defaults = getDefaultThread({
      id: "456",
      name: "test",
      type: 1,
      server_id: "100",
      parent_id: "123",
    });
    expect(defaults).toEqual(expected_defaults);
  });
});

describe("Default Server Settings Values", () => {
  it("should verify server settings default values are correct", async () => {
    await prisma.server.create({
      data: {
        id: "100",
        name: "test",
      },
    });
    const expected_defaults = await prisma.serverSettings.create({
      data: {
        server_id: "100",
      },
    });
    const defaults = getDefaultServerSettings({
      server_id: "100",
    });
    expect(defaults).toEqual(expected_defaults);
  });
});

describe("Default User Server Settings Values", () => {
  it("should verify user server settings default values are correct", async () => {
    await prisma.server.create({
      data: {
        id: "100",
        name: "test",
      },
    });
    await prisma.discordAccount.create({
      data: {
        id: "200",
        name: "test",
      },
    });
    const expected_defaults = await prisma.userServerSettings.create({
      data: {
        user_id: "200",
        server_id: "100",
      },
    });
    const defaults = getDefaultUserServerSettings({
      user_id: "200",
      server_id: "100",
    });
    expect(defaults).toEqual(expected_defaults);
  });
});
