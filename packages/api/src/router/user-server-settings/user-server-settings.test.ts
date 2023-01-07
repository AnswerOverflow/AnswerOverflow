/* eslint-disable no-unused-vars */
import { clearDatabase, DiscordAccount, Server } from "@answeroverflow/db";
import { getGeneralScenario, ServerTestData } from "~api/test/utils";
import { discordAccountRouter } from "../accounts/discord-accounts";
import { serverRouter } from "../server/server";
import { SERVER_NOT_SETUP_MESSAGE, userServerSettingsRouter } from "./user-server-settings";

let data: ServerTestData;
let user_1_router: ReturnType<typeof userServerSettingsRouter["createCaller"]>;
let user_2_router: ReturnType<typeof userServerSettingsRouter["createCaller"]>;
let user1: DiscordAccount;
let user2: DiscordAccount;
let discord_account_router: ReturnType<typeof discordAccountRouter["createCaller"]>;
let server_router: ReturnType<typeof serverRouter["createCaller"]>;
let server: Server;

beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  data = data1;
  user_1_router = userServerSettingsRouter.createCaller(data1.manage_guild_ctx);
  user_2_router = userServerSettingsRouter.createCaller(data1.default_ctx);
  server_router = serverRouter.createCaller(data1.manage_guild_ctx);
  discord_account_router = discordAccountRouter.createCaller(data1.bot_caller_ctx);
  user1 = data1.guild_manager_member;
  user2 = data1.guild_default_member;
  server = data1.server;
  await clearDatabase();
});

describe("User Server Settings Create", () => {
  it("should create user server settings", async () => {
    await server_router.create(server);
    await discord_account_router.create(user1);
    const user_server_settings = await user_1_router.create({
      server_id: server.id,
      user_id: user1.id,
    });
    expect(user_server_settings).toBeDefined();
  });
});

describe("User Server Settings Create With Deps", () => {
  it("should create user server settings with user deps", async () => {
    await server_router.create(server);
    const user_server_settings = await user_2_router.createWithDeps({
      user: user2,
      server_id: server.id,
    });
    expect(user_server_settings).toBeDefined();
  });
  it("should fail to create user server settings with deps if the server does not exist yet", async () => {
    await expect(
      user_2_router.createWithDeps({
        user: user2,
        server_id: server.id,
      })
    ).rejects.toThrowError(SERVER_NOT_SETUP_MESSAGE);
  });
});

describe("User Server Settings Upsert", () => {
  beforeEach(async () => {
    await server_router.create(server);
    await discord_account_router.create(user1);
  });
  it("should upsert new user server settings", async () => {
    const user_server_settings = await user_1_router.upsert({
      server_id: server.id,
      user_id: user1.id,
    });
    expect(user_server_settings).toBeDefined();
  });
});

describe("User Server Settings Upsert With Deps", () => {
  it("should upsert user server settings with user deps", async () => {
    await server_router.create(server);
    const user_server_settings = await user_2_router.upsertWithDeps({
      user: user2,
      server_id: server.id,
      flags: {
        can_publicly_display_messages: true,
      },
    });
    expect(user_server_settings).toBeDefined();
  });
  it("should fail to upsert user server settings with deps if the server does not exist yet", async () => {
    await expect(
      user_2_router.upsertWithDeps({
        user: user2,
        server_id: server.id,
      })
    ).rejects.toThrowError(SERVER_NOT_SETUP_MESSAGE);
  });
  it("should update user server settings with user deps", async () => {
    await server_router.create(server);
    await discord_account_router.create(user2);
    await user_2_router.create({
      server_id: server.id,
      user_id: user2.id,
    });
    const user_server_settings = await user_2_router.upsertWithDeps({
      user: user2,
      server_id: server.id,
      flags: {
        can_publicly_display_messages: true,
      },
    });
    expect(user_server_settings.flags.can_publicly_display_messages).toBeTruthy();
  });
});

describe("User Server Settings Get", () => {
  it("should get user server settings", async () => {
    await server_router.create(server);
    await discord_account_router.create(user1);
    await user_1_router.create({
      server_id: server.id,
      user_id: user1.id,
    });
    const user_server_settings = await user_1_router.byId({
      server_id: server.id,
      user_id: user1.id,
    });
    expect(user_server_settings).toBeDefined();
  });
});
