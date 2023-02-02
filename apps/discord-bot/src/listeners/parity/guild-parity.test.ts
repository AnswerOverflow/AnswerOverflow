import type { SapphireClient } from "@sapphire/framework";
import { Events, Guild } from "discord.js";
import { prisma } from "@answeroverflow/db";
import { clearDatabase } from "@answeroverflow/db";
import {
  mockGuild,
  mockTextChannel,
  mockForumChannel,
  emitEvent,
  copyClass,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/utils/sapphire-mock";

let client: SapphireClient;
let guild: Guild;

beforeEach(async () => {
  await clearDatabase();
  client = await setupAnswerOverflowBot();
  guild = mockGuild(client);
});

describe("Guild Create Parity", () => {
  it("should sync a server on join", async () => {
    mockTextChannel(client, guild);
    mockForumChannel(client, guild);
    await emitEvent(client, Events.GuildCreate, guild);
    const created_server = await prisma.server.findUnique({
      where: { id: guild.id },
      include: { channels: true },
    });
    expect(created_server).toBeDefined();
    expect(created_server?.name).toBe(guild.name);
    expect(created_server?.channels).toHaveLength(2);
  });
  it("should update an existing server on rejoin", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const created_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(created_server).toBeDefined();
    expect(created_server?.name).toBe(guild.name);
    const new_name = "new name";
    guild.name = new_name;
    await emitEvent(client, Events.GuildCreate, guild);
    const updated_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(updated_server).toBeDefined();
    expect(updated_server?.name).toBe(new_name);
  });
  it("should clear the kick status of a server on join", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const created_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(created_server).toBeDefined();
    expect(created_server?.name).toBe(guild.name);
    expect(created_server?.kicked_time).toBeNull();
  });
});

describe("Guild Delete Parity", () => {
  it("should set the kick status of a server on delete", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const created_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(created_server).toBeDefined();
    expect(created_server?.name).toBe(guild.name);
    expect(created_server?.kicked_time).toBeNull();

    await emitEvent(client, Events.GuildDelete, guild);
    const deleted_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(deleted_server).toBeDefined();
    expect(deleted_server?.name).toBe(guild.name);
    expect(deleted_server?.kicked_time?.getUTCDate()).toBeCloseTo(new Date().getUTCDate());
  });
  it("should create a server on delete if it doesn't exist", async () => {
    await emitEvent(client, Events.GuildDelete, guild);
    const deleted_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(deleted_server).toBeDefined();
    expect(deleted_server?.name).toBe(guild.name);
    expect(deleted_server?.kicked_time?.getUTCDate()).toBeCloseTo(new Date().getUTCDate());
  });
});

describe("Guild Update Parity", () => {
  it("should update a server on update", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const created_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(created_server).toBeDefined();
    expect(created_server?.name).toBe(guild.name);

    const new_guild = copyClass(guild, client, { name: "new name" });
    await emitEvent(client, Events.GuildUpdate, guild, new_guild);
    const updated_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(updated_server).toBeDefined();
    expect(updated_server?.name).toBe("new name");
  });
  it("should create a server on update if it doesn't exist", async () => {
    const new_name = "new name";
    const new_guild = copyClass(guild, client, { name: "new name" });
    await emitEvent(client, Events.GuildUpdate, guild, new_guild);
    const updated_server = await prisma.server.findUnique({
      where: { id: guild.id },
    });
    expect(updated_server).toBeDefined();
    expect(updated_server?.name).toBe(new_name);
  });
});
