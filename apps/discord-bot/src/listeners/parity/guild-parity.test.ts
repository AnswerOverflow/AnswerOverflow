import type { SapphireClient } from "@sapphire/framework";
import { Events, Guild } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { copyClass, emitEvent } from "~discord-bot/test/utils/helpers";
import { clearDatabase, prisma } from "@answeroverflow/db";
let data: Awaited<ReturnType<typeof createNormalScenario>>;
let client: SapphireClient;
let guild: Guild;

beforeEach(async () => {
  await clearDatabase();
  data = await createNormalScenario();
  client = data.client;
  guild = data.guild;
});

describe("Guild Create Parity", () => {
  it("should sync a server on join", async () => {
    const { client, guild } = await createNormalScenario();
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
