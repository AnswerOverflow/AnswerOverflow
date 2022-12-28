import { clearDatabase } from "@answeroverflow/db";
import { getGeneralScenario, ServerTestData } from "~api/test/utils";
import { channelSettingsRouter } from "./channel_settings";

let data: ServerTestData;
let manage_channel_settings_router: ReturnType<typeof channelSettingsRouter["createCaller"]>;
beforeEach(async () => {
  const { data: server_data, manage_guild_ctx } = await getGeneralScenario();
  data = server_data;
  manage_channel_settings_router = channelSettingsRouter.createCaller(manage_guild_ctx);
  await clearDatabase();
});

describe("Channel Settings Upsert With Deps", () => {
  it("should succeed upserting a channel settings with manage guild", async () => {
    const channel_settings = await manage_channel_settings_router.upsertWithDeps({
      create: {
        channel: {
          create: {
            channel: {
              ...data.text_channels[0].channel,
            },
            server: {
              create: {
                ...data.server,
              },
              update: {
                id: data.server.id,
              },
            },
          },
          update: {
            id: data.text_channels[0].channel.id,
          },
        },
        settings: {
          channel_id: data.text_channels[0].channel.id,
          solution_tag_id: "101",
        },
      },
      update: {
        channel_id: data.text_channels[0].channel.id,
      },
    });
    expect(channel_settings).toBeDefined();
    expect(channel_settings.solution_tag_id).toBe("101");
  });
});

describe("Channel Settings Fetch", () => {
  it("should fetch by invite code", async () => {
    const channel_settings = await manage_channel_settings_router.createWithDeps({
      channel: {
        create: {
          channel: data.text_channels[0].channel,
          server: {
            create: data.server,
            update: data.server,
          },
        },
        update: data.text_channels[0].channel,
      },
      settings: {
        channel_id: data.text_channels[0].channel.id,
        invite_code: "1234",
      },
    });
    expect(channel_settings).toBeDefined();
    expect(channel_settings.invite_code).toBe("1234");

    const updated_channel_settings = await manage_channel_settings_router.byInviteCode("1234");
    expect(updated_channel_settings).toBeDefined();
  });
});
