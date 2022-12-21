import { clearDatabase } from "@answeroverflow/db";
import {
  TEST_CHANNEL_1,
  TEST_CHANNEL_1_UPSERT,
  TEST_CHANNEL_2,
  TEST_CHANNEL_2_UPSERT,
} from "~api/test/utils";
import { createContextInner } from "../context";
import { channelRouter } from "./channel";

// eslint-disable-next-line no-unused-vars
let channels: ReturnType<typeof channelRouter["createCaller"]>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    caller: "discord-bot",
    user_servers: null,
  });
  channels = channelRouter.createCaller(a);
  await clearDatabase();
});

describe("Channel Upsert", () => {
  it("should create a new channel", async () => {
    const channel = await channels.upsert(TEST_CHANNEL_1_UPSERT);
    expect(channel).toMatchObject(TEST_CHANNEL_1);
  });
});

describe("Channel Upsert Bulk", () => {
  it("should create multiple new channels", async () => {
    const created_channels = await channels.upsertBulk([
      TEST_CHANNEL_1_UPSERT,
      TEST_CHANNEL_2_UPSERT,
    ]);
    expect(created_channels).toMatchObject([TEST_CHANNEL_1, TEST_CHANNEL_2]);
  });
});
