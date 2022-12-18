import { mockGuild } from "./guild-mock";
import { mockClient } from "./mock";
import { mockUser } from "./user-mock";

describe("Guild Mock", () => {
  it("should create a guild", async () => {
    const client = mockClient();
    await client.login();
    const guild = mockGuild(client);
    expect(guild).toBeDefined();
    expect(client.guilds.cache.get(guild.id)).toBeDefined();
    expect(guild.ownerId).toBeDefined();
    expect(client.users.cache.get(guild.ownerId)).toBeDefined();
    expect(guild.members.cache.get(guild.ownerId)).toBeDefined();
  });
  it("should create a guild with a custom owner", async () => {
    const client = mockClient();
    await client.login();
    const owner = mockUser(client);
    const guild = mockGuild(client, owner);
    expect(guild).toBeDefined();
    expect(client.guilds.cache.get(guild.id)).toBeDefined();
    expect(guild.ownerId).toBeDefined();
    expect(client.users.cache.get(guild.ownerId)).toBeDefined();
    expect(guild.members.cache.get(guild.ownerId)).toBeDefined();
  });
  it("should create a user and then a guild ", async () => {
    const client = mockClient();
    await client.login();
    const random_user = mockUser(client);
    const guild = mockGuild(client);
    expect(guild).toBeDefined();
    expect(client.guilds.cache.get(guild.id)).toBeDefined();
    expect(guild.ownerId).toBeDefined();
    expect(client.users.cache.get(guild.ownerId)).toBeDefined();
    expect(random_user.id).not.toBe(guild.ownerId);
    expect(guild.members.cache.get(guild.ownerId)).toBeDefined();
    expect(client.users.cache.size).toBe(2);
    expect(guild.members.cache.size).toBe(1);
    expect(guild.members.cache.get(random_user.id)).toBeUndefined();
  });
  it("should have a @everyone default role", async () => {
    const client = mockClient();
    await client.login();
    const guild = mockGuild(client);
    expect(guild.roles.cache.get(guild.id)).toBeDefined();
    expect(guild.roles.everyone).toBeDefined();
  });
});
