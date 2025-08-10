import { DiscordConfig, Intents } from "dfx";
import { Config } from "effect";

export const DiscordConfigLayer = DiscordConfig.layerConfig({
  token: Config.redacted("DISCORD_BOT_TOKEN"),
  gateway: {
    intents: Config.succeed(
      Intents.fromList(["GuildMessages", "MessageContent", "Guilds"])
    ),
  },
});
