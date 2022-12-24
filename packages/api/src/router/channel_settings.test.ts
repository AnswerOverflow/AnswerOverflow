import { clearDatabase } from "@answeroverflow/db";
import { getGeneralScenario, ServerTestData } from "../test/utils";
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
              ...data.channels[0],
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
            id: data.channels[0].id,
          },
        },
        settings: {
          channel_id: data.channels[0].id,
          solution_tag_id: "101",
        },
      },
      update: {
        channel_id: data.channels[0].id,
      },
    });
    expect(channel_settings).toBeDefined();
    expect(channel_settings.solution_tag_id).toBe("101");
  });
});
