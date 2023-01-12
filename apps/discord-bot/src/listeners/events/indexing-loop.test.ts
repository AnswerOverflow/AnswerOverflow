import { Client, Events } from "discord.js";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { delay, emitEvent } from "~discord-bot/test/utils/helpers";
import { indexServers } from "~discord-bot/utils/indexing";

jest.mock("~discord-bot/utils/indexing", () => {
  const original = jest.requireActual("~discord-bot/utils/indexing");
  return {
    ...original,
    indexServers: jest.fn(),
  };
});

describe("Indexing Loop", () => {
  it("should index all servers", async () => {
    // @ts-ignore
    indexServers.mockImplementation(async () => {});

    process.env.INDEXING_INTERVAL_IN_HOURS = "0.0001";
    const interval_in_ms = parseInt(process.env.INDEXING_INTERVAL_IN_HOURS) * 60 * 60 * 1000; // 360 ms
    const data = await setupBot();
    await emitEvent(data.client, Events.ClientReady, data.client as Client);

    await delay(interval_in_ms + 100);

    expect(indexServers).toHaveBeenCalledTimes(2);
  });
});
