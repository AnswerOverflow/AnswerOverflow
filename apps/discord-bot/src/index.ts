import "./lib/setup";
import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import { AnswerOverflowClient } from "@answeroverflow/core";

declare module "@sapphire/pieces" {
  interface Container {
    answer_overflow: AnswerOverflowClient;
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
    "GUILDS",
    "GUILD_MEMBERS",
    "GUILD_BANS",
    "GUILD_EMOJIS_AND_STICKERS",
    "GUILD_VOICE_STATES",
    "GUILD_MESSAGES",
    "GUILD_MESSAGE_REACTIONS",
    "DIRECT_MESSAGES",
    "DIRECT_MESSAGE_REACTIONS",
  ],
  partials: ["CHANNEL"],
  loadMessageCommandListeners: true,
});

const main = async () => {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  require("dotenv").config();
  try {
    client.logger.info("Logging in");
    await client.login(process.env.DISCORD_TOKEN);
    client.logger.info("logged in");
    container.answer_overflow = new AnswerOverflowClient();
  } catch (error) {
    client.logger.fatal(error);
    client.destroy();
    process.exit(1);
  }
};

void main();
