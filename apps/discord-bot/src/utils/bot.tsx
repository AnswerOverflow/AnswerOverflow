import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import { InteractionReplyRenderer, ReacordDiscordJs, ReacordTester } from "@answeroverflow/reacord";
import { ClientOptions, Partials } from "discord.js";

import "~discord-bot/utils/setup";
import { Router } from "~discord-bot/components/primitives";
import React from "react";

declare module "@sapphire/pieces" {
  interface Container {
    reacord: ReacordDiscordJs | ReacordTester;
    messageHistory: Map<
      string,
      {
        history: React.ReactNode[];
        pushHistory: (message: React.ReactNode) => void;
        popHistory: () => void;
      }
    >;
  }
}

function getLogLevel() {
  switch (process.env.NODE_ENV) {
    case "development":
      return process.env.BOT_DEV_LOG_LEVEL
        ? parseInt(process.env.BOT_DEV_LOG_LEVEL)
        : LogLevel.Debug;
    case "test":
      return process.env.BOT_TEST_LOG_LEVEL
        ? parseInt(process.env.BOT_TEST_LOG_LEVEL)
        : LogLevel.None;
    case "production":
      return process.env.BOT_PROD_LOG_LEVEL
        ? parseInt(process.env.BOT_PROD_LOG_LEVEL)
        : LogLevel.Info;
    default:
      return LogLevel.Info;
  }
}

export function createClient(override: Partial<ClientOptions> = {}) {
  return new SapphireClient({
    defaultPrefix: "!",
    regexPrefix: /^(hey +)?bot[,! ]/i,
    caseInsensitiveCommands: true,
    logger: {
      level: getLogLevel(),
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
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction],
    loadMessageCommandListeners: true,
    hmr: {
      enabled: process.env.NODE_ENV === "development",
    },
    api: {
      automaticallyConnect: process.env.NODE_ENV !== "test", // TODO: Bit of a hack? No point starting API during testing but would be good to verify it
    },
    ...override,
  });
}

export const login = async (client: SapphireClient) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
  require("dotenv").config();
  try {
    client.logger.info("Logging in");
    await client.login(process.env.DISCORD_TOKEN);
    client.logger.info("logged in");
    const messageHistory = new Map<
      string,
      {
        history: React.ReactNode[];
        pushHistory: (message: React.ReactNode) => void;
        popHistory: () => void;
      }
    >();
    container.messageHistory = messageHistory;
    container.reacord = new ReacordDiscordJs(client, {}, ({ children, renderer }) => {
      if (renderer instanceof InteractionReplyRenderer) {
        return <Router interactionId={renderer.interaction.id}>{children}</Router>;
      } else {
        return children;
      }
    });
  } catch (error) {
    client.logger.fatal(error);
    client.destroy();
    process.exit(1);
  }
};
