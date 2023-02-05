import { extendedAdapter } from "./adapter";
import type { z } from "zod";
import type { z_user_schema } from "./discord-oauth";
import { prisma } from "@answeroverflow/db";
import { getRandomEmail, getRandomId } from "@answeroverflow/utils";
let mock_discord_account: z.infer<typeof z_user_schema>;
beforeEach(() => {
  vitest.mock("./discord-oauth", () => ({
    getDiscordUser: vitest.fn(() => {
      return mock_discord_account;
    }),
  }));
  mock_discord_account = {
    id: getRandomId(),
    username: "TestUser",
    avatar: "1234567890",
    discriminator: "1234",
    public_flags: 0,
    flags: 0,
    locale: "en-US",
    mfa_enabled: false,
    email: getRandomEmail(),
    verified: true,
    bot: false,
  };
});

describe("Discord Auth", () => {
  // This is the first time we have ever seen this user, we need to generate information for them
  it("should create a Discord user for a new account", async () => {
    const created_user = await extendedAdapter.createUser({
      email: mock_discord_account.email!,
      emailVerified: null,
    });
    await extendedAdapter.linkAccount({
      provider: "discord",
      providerAccountId: mock_discord_account.id,
      type: "oauth",
      userId: created_user.id,
      access_token: "1234567890",
    });
    const user = await prisma.discordAccount.findUnique({
      where: {
        id: mock_discord_account.id,
      },
    });
    expect(user).toEqual({
      id: mock_discord_account.id,
      name: mock_discord_account.username,
      avatar: mock_discord_account.avatar,
    });
  });
  // We have first seen their account on Discord from indexing their messages, we are linking their indexed account to what was signed in with
  it("should link to a Discord user for an existing account", async () => {
    await prisma.discordAccount.create({
      data: {
        id: mock_discord_account.id,
        name: mock_discord_account.username,
        avatar: mock_discord_account.avatar,
      },
    });
    const created_user = await extendedAdapter.createUser({
      email: mock_discord_account.email!,
      emailVerified: null,
    });
    await extendedAdapter.linkAccount({
      provider: "discord",
      providerAccountId: mock_discord_account.id,
      type: "oauth",
      userId: created_user.id,
      access_token: "1234567890",
    });
    const user = await prisma.discordAccount.findUnique({
      where: {
        id: mock_discord_account.id,
      },
    });
    expect(user).toEqual({
      id: mock_discord_account.id,
      name: mock_discord_account.username,
      avatar: mock_discord_account.avatar,
    });
    const account = await prisma.account.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "discord",
          providerAccountId: mock_discord_account.id,
        },
      },
    });
    expect(account?.providerAccountId).toBe(mock_discord_account.id);
  });
});
