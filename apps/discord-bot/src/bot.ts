import "~utils/setup";
import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import "@sapphire/plugin-api/register";
import { ReacordDiscordJs, ReacordTester } from "@answeroverflow/reacord";
import { Partials } from "discord.js";
declare module "@sapphire/pieces" {
  // eslint-disable-next-line no-unused-vars
  interface Container {
    reacord: ReacordDiscordJs | ReacordTester;
  }
}

const client = new SapphireClient({
  defaultPrefix: "!",
  regexPrefix: /^(hey +)?bot[,! ]/i,
  caseInsensitiveCommands: true,
  logger: {
    level: LogLevel.Debug,
  },
  shards: "auto",
  intents: [
    "Guilds",
    "GuildMembers",
    "GuildBans",
    "GuildEmojisAndStickers",
    "GuildVoiceStates",
    "GuildMessages",
    "GuildMessageReactions",
    "DirectMessages",
    "DirectMessageReactions",
  ],
  partials: [Partials.Channel],
  loadMessageCommandListeners: true,
  hmr: {
    enabled: process.env.NODE_ENV === "development",
  },
});

export const login = async () => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  require("dotenv").config();
  try {
    client.logger.info("Logging in");
    await client.login(process.env.DISCORD_TOKEN);
    client.logger.info("logged in");
    container.reacord = new ReacordDiscordJs(client);
  } catch (error) {
    client.logger.fatal(error);
    client.destroy();
    process.exit(1);
  }
};
