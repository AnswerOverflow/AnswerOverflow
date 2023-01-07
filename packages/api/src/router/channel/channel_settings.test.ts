import { clearDatabase } from "@answeroverflow/db";
import { getGeneralScenario, ServerTestData } from "~api/test/utils";
import { channelSettingsRouter } from "./channel_settings";

let data: ServerTestData;
let manage_channel_settings_router: ReturnType<typeof channelSettingsRouter["createCaller"]>;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  data = data1;
  manage_channel_settings_router = channelSettingsRouter.createCaller(data1.manage_guild_ctx);
  await clearDatabase();
});

describe("Channel Settings Upsert With Deps", () => {
  it("should succeed upserting a channel settings with manage guild", async () => {
    const channel_settings = await manage_channel_settings_router.upsertWithDeps({
      channel: {
        channel: data.text_channels[0].channel,
        server: data.server,
      },
      settings: {
        solution_tag_id: "101",
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
        channel: data.text_channels[0].channel,
        server: data.server,
      },
      settings: {
        invite_code: "1234",
      },
    });
    expect(channel_settings).toBeDefined();
    expect(channel_settings.invite_code).toBe("1234");

    const updated_channel_settings = await manage_channel_settings_router.byInviteCode("1234");
    expect(updated_channel_settings).toBeDefined();
  });
});
