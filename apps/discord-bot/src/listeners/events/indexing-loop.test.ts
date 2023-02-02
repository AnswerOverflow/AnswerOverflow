import { Client, Events } from "discord.js";
import { setupBot } from "~discord-bot/test/utils/discordjs/scenarios";
import { delay, emitEvent } from "~discord-bot/test/utils/helpers";
import { indexServers } from "~discord-bot/utils/listeners/indexing";
/*
  Ref: https://www.chakshunyu.com/blog/how-to-mock-only-one-function-from-a-module-in-jest/
  Spying on the function wasn't working so we ended up with this hacky solution
*/
jest.mock("~discord-bot/utils/indexing", () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const original = jest.requireActual("~discord-bot/utils/indexing");
  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return {
    ...original,
    indexServers: jest.fn(),
  };
});

describe("Indexing Loop", () => {
  it("should index all servers", async () => {
    // @ts-ignore
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call
    indexServers.mockImplementation(async () => {});
    jest.useFakeTimers({
      doNotFake: ["setTimeout"],
    });
    const data = await setupBot();
    await emitEvent(data.client, Events.ClientReady, data.client as Client);
    jest.advanceTimersByTime(86400000); // advance time by 24 hours in ms
    await delay(2000); // doesn't run correctly without this
    expect(indexServers).toHaveBeenCalledTimes(2);
  });
});
