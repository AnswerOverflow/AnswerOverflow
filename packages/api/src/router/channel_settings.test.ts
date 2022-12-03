import { TEST_SERVER_1, clearDatabase, TEST_CHANNEL_1 } from "@test/utils";
import { TRPCError } from "@trpc/server";
import { PermissionsBitField } from "discord.js";
import { botRouter } from ".";
import { createBotContext } from "../context";

// eslint-disable-next-line no-unused-vars
let router_manage_guilds: ReturnType<typeof botRouter["createCaller"]>;
let router_no_permissions: ReturnType<typeof botRouter["createCaller"]>;

beforeEach(async () => {
  const manageGuildContext = await createBotContext({
    session: {
      expires: new Date().toUTCString(),
      user: {
        email: null,
        image: "https://example.com",
        name: "test",
        id: "1",
      },
    },
    user_servers: [
      {
        features: [],
        icon: null,
        id: TEST_SERVER_1.id,
        name: TEST_SERVER_1.name,
        owner: false,
        permissions: PermissionsBitField.resolve("ManageGuild").toString(),
      },
    ],
  });
  const noPermissionsContext = await createBotContext({
    session: {
      expires: new Date().toUTCString(),
      user: {
        email: null,
        image: "https://example.com",
        name: "test",
        id: "1",
      },
    },
    user_servers: [
      {
        features: [],
        icon: null,
        id: TEST_SERVER_1.id,
        name: TEST_SERVER_1.name,
        owner: false,
        permissions: "0",
      },
    ],
  });

  router_no_permissions = botRouter.createCaller(noPermissionsContext);
  router_manage_guilds = botRouter.createCaller(manageGuildContext);
  await clearDatabase();
});

const TEST_CREATE_CHANNEL_SETTINGS = {
  create: {
    channel: {
      create: {
        ...TEST_CHANNEL_1,
        server: {
          create: {
            ...TEST_SERVER_1,
          },
          update: {
            ...TEST_SERVER_1,
          },
        },
      },
      update: {
        ...TEST_CHANNEL_1,
      },
    },
  },
  update: {},
};

describe("channelRouter", () => {
  it("should upsert channel settings with no permissions", async () => {
    await expect(
      router_no_permissions.channel_settings.upsert(TEST_CREATE_CHANNEL_SETTINGS)
    ).rejects.toThrow(TRPCError);
  });
  it("should upsert channel settings with manage guilds permissions", async () => {
    const result = await router_manage_guilds.channel_settings.upsert(TEST_CREATE_CHANNEL_SETTINGS);
    expect(result).toBeDefined();
  });
});
