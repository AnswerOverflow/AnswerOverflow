import { prisma } from "..";
import {
  getDefaultChannel,
  getDefaultChannelSettings,
  getDefaultChannelSettingsWithFlags,
  getDefaultThread,
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
