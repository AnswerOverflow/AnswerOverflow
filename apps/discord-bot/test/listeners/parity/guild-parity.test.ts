import type { Listener, SapphireClient } from "@sapphire/framework";
import { Events, Guild } from "discord.js";
import { createNormalScenario } from "~discord-bot/test/utils/discordjs/scenarios";
import { delay } from "~discord-bot/test/utils/helpers";

let data: Awaited<ReturnType<typeof createNormalScenario>>;
let client: SapphireClient;
let guild: Guild;

beforeEach(async () => {
  data = await createNormalScenario();
  client = data.client;
  guild = data.guild;
});

describe("Guild Create Parity", () => {
  let guild_create_listener: Listener;
  beforeEach(() => {
    guild_create_listener = client.stores
      .get("listeners")
      .find((listener) => listener.name === "Sync On Join")!;
    expect(guild_create_listener).toBeDefined();
  });
  it("should sync a server on join", async () => {
    jest.spyOn(guild_create_listener, "run");
    client.emit(Events.GuildCreate, guild);
    await delay();

    expect(guild_create_listener.run).toHaveBeenCalledTimes(1);
  });
});
