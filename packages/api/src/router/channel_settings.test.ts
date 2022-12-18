import { clearDatabase } from "@answeroverflow/db";
import { TEST_SERVER_1, TEST_CHANNEL_1 } from "~api/test/utils";
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
        permissions: Number(PermissionsBitField.resolve("ManageGuild")),
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
        permissions: 0,
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
  it("should upsert a channel and then upsert channel settings", async () => {
    const result = await router_manage_guilds.channels.upsert({
      create: {
        ...TEST_CHANNEL_1,
      },
      update: {
        ...TEST_CHANNEL_1,
      },
    });
    expect(result).toBeDefined();
    const result2 = await router_manage_guilds.channel_settings.upsert({
      create: {
        channel: {
          create: {
            ...TEST_CHANNEL_1,
          },
          update: {
            ...TEST_CHANNEL_1,
          },
        },
      },
      update: {},
    });
    expect(result2).toBeDefined();
  });
  it("should enable indexing on a channel", async () => {
    const result = await router_manage_guilds.channel_settings.upsert({
      create: {
        channel: {
          create: {
            ...TEST_CHANNEL_1,
          },
          update: {
            ...TEST_CHANNEL_1,
          },
        },
      },
      update: {
        flags: {
          indexing_enabled: true,
        },
      },
    });
    expect(result).toBeDefined();
    expect(result.flags.indexing_enabled).toBe(true);
  });
  it("should set the solution_tag_id on a channel", async () => {
    const result = await router_manage_guilds.channel_settings.upsert({
      create: {
        channel: {
          create: {
            ...TEST_CHANNEL_1,
          },
          update: {
            ...TEST_CHANNEL_1,
          },
        },
      },
      update: {
        solution_tag_id: "1",
      },
    });
    expect(result).toBeDefined();
    expect(result.solution_tag_id).toBe("1");
  });
});
