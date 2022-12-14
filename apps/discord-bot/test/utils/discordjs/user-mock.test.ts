import { PermissionsBitField } from "discord.js";
import { mockGuild } from "./guild-mock";
import { mockClient } from "./mock";
import { mockGuildMember, mockUser } from "./user-mock";

describe("User Mock", () => {
  it("should create a mocked user", async () => {
    const client = mockClient();
    await client.login();
    const user = mockUser(client);
    expect(user).toBeDefined();
    expect(client.users.cache.get(user.id)).toBeDefined();
  });
});
describe("Member Mock", () => {
  it("should create a basic member", async () => {
    const client = mockClient();
    await client.login();
    const member = mockGuildMember(client);
    expect(member).toBeDefined();
    expect(client.users.cache.get(member.id)).toBeDefined();
    expect(client.guilds.cache.get(member.guild.id)).toBeDefined();
    expect(member.guild.members.cache.get(member.id)).toBeDefined();
  });
  it("should create a member with a custom user", async () => {
    const client = mockClient();
    await client.login();
    const user = mockUser(client);
    const member = mockGuildMember(client, user);
    expect(member).toBeDefined();
    expect(client.users.cache.get(member.id)).toBeDefined();
    expect(client.guilds.cache.get(member.guild.id)).toBeDefined();
    expect(member.guild.members.cache.get(member.id)).toBeDefined();
  });
  it("should create a member with a custom guild", async () => {
    const client = mockClient();
    await client.login();
    const guild = mockGuild(client);
    const member = mockGuildMember(client, undefined, guild);
    expect(member).toBeDefined();
    expect(client.users.cache.get(member.id)).toBeDefined();
    expect(client.guilds.cache.get(member.guild.id)).toBeDefined();
    expect(member.guild.members.cache.get(member.id)).toBeDefined();
  });
  it("should create a member with a custom user and guild", async () => {
    const client = mockClient();
    await client.login();
    const user = mockUser(client);
    const guild = mockGuild(client);
    const member = mockGuildMember(client, user, guild);
    expect(member).toBeDefined();
    expect(client.users.cache.get(member.id)).toBeDefined();
    expect(client.guilds.cache.get(member.guild.id)).toBeDefined();
    expect(member.guild.members.cache.get(member.id)).toBeDefined();
  });
});

describe("Member Mock", () => {
  it("should create a default member", async () => {
    const client = mockClient();
    await client.login();
    const member = mockGuildMember(client);
    expect(member).toBeDefined();
    expect(client.users.cache.get(member.id)).toBeDefined();
    expect(client.guilds.cache.get(member.guild.id)).toBeDefined();
    expect(member.guild.members.cache.get(member.id)).toBeDefined();
  });
  it("should own the created guild", async () => {
    const client = mockClient();
    await client.login();
    const member = mockGuildMember(client);
    expect(member).toBeDefined();
    expect(member.permissions.bitfield.toString()).toBe(PermissionsBitField.All.toString());
    expect(member.guild.ownerId).toBe(member.id);
  });
  it("should create a member with manage server permissions", async () => {
    const client = mockClient();
    await client.login();
    const owner = mockGuildMember(client);
    const manager = mockGuildMember(
      client,
      undefined,
      owner.guild,
      PermissionsBitField.resolve("ManageGuild")
    );
    expect(manager).toBeDefined();
    expect(manager.permissions.has("ManageGuild")).toBe(true);
  });
  it("should create an adminstrator member", async () => {
    const client = mockClient();
    await client.login();
    const owner = mockGuildMember(client);
    const admin = mockGuildMember(
      client,
      undefined,
      owner.guild,
      PermissionsBitField.resolve("Administrator")
    );
    expect(admin).toBeDefined();
    expect(admin.permissions.has("Administrator")).toBe(true);
  });
  it("should create a normal member", async () => {
    const client = mockClient();
    await client.login();
    const owner = mockGuildMember(client);
    const member = mockGuildMember(client, undefined, owner.guild);
    expect(member).toBeDefined();
    expect(member.permissions.has("Administrator")).toBe(false);
    expect(member.permissions.has("ManageGuild")).toBe(false);
    expect(member.permissions.has("AddReactions")).toBe(true);
    expect(member.permissions.has(PermissionsBitField.Default)).toBeTruthy();
  });
});
