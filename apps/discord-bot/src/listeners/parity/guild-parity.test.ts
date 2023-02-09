import type { SapphireClient } from "@sapphire/framework";
import { Events, Guild } from "discord.js";
import {
  mockGuild,
  mockTextChannel,
  mockForumChannel,
  emitEvent,
  copyClass,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { findManyChannelsById, findServerById } from "@answeroverflow/db";

let client: SapphireClient;
let guild: Guild;

beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  guild = mockGuild(client);
});

describe("Guild Create Parity", () => {
  it("should sync a server on join", async () => {
    const a = mockTextChannel(client, guild);
    const b = mockForumChannel(client, guild);
    await emitEvent(client, Events.GuildCreate, guild);
    const createdServer = await findServerById(guild.id);
    const createdChannels = await findManyChannelsById([a.id, b.id]);
    expect(createdServer).toBeDefined();
    expect(createdServer?.name).toBe(guild.name);
    expect(createdChannels).toHaveLength(2);
  });
  it("should update an existing server on rejoin", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const createdServer = await findServerById(guild.id);
    expect(createdServer).toBeDefined();
    expect(createdServer?.name).toBe(guild.name);
    const newName = "new name";
    guild.name = newName;
    await emitEvent(client, Events.GuildCreate, guild);
    const updatedServer = await findServerById(guild.id);
    expect(updatedServer).toBeDefined();
    expect(updatedServer?.name).toBe(newName);
  });
  it("should clear the kick status of a server on join", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const createdServer = await findServerById(guild.id);
    expect(createdServer).toBeDefined();
    expect(createdServer?.name).toBe(guild.name);
    expect(createdServer?.kickedTime).toBeNull();
  });
});

describe("Guild Delete Parity", () => {
  it("should set the kick status of a server on delete", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const createdServer = await findServerById(guild.id);
    expect(createdServer).toBeDefined();
    expect(createdServer?.name).toBe(guild.name);
    expect(createdServer?.kickedTime).toBeNull();

    await emitEvent(client, Events.GuildDelete, guild);
    const deletedServer = await findServerById(guild.id);
    expect(deletedServer).toBeDefined();
    expect(deletedServer?.name).toBe(guild.name);
    expect(deletedServer?.kickedTime?.getUTCDate()).toBeCloseTo(new Date().getUTCDate());
  });
  it("should create a server on delete if it doesn't exist", async () => {
    await emitEvent(client, Events.GuildDelete, guild);
    const deletedServer = await findServerById(guild.id);
    expect(deletedServer).toBeDefined();
    expect(deletedServer?.name).toBe(guild.name);
    expect(deletedServer?.kickedTime?.getUTCDate()).toBeCloseTo(new Date().getUTCDate());
  });
});

describe("Guild Update Parity", () => {
  it("should update a server on update", async () => {
    await emitEvent(client, Events.GuildCreate, guild);
    const createdServer = await findServerById(guild.id);
    expect(createdServer).toBeDefined();
    expect(createdServer?.name).toBe(guild.name);

    const newGuild = copyClass(guild, client, { name: "new name" });
    await emitEvent(client, Events.GuildUpdate, guild, newGuild);
    const updatedServer = await findServerById(guild.id);
    expect(updatedServer).toBeDefined();
    expect(updatedServer?.name).toBe("new name");
  });
  it("should create a server on update if it doesn't exist", async () => {
    const newName = "new name";
    const newGuild = copyClass(guild, client, { name: "new name" });
    await emitEvent(client, Events.GuildUpdate, guild, newGuild);
    const updatedServer = await findServerById(guild.id);
    expect(updatedServer).toBeDefined();
    expect(updatedServer?.name).toBe(newName);
  });
});
