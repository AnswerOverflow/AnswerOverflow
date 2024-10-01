import {
  container,
  Events,
  LogLevel,
  SapphireClient,
} from "@sapphire/framework";

import "../utils/setup";
import React from "react";
import LRUCache from "lru-cache";
import type { AOEventSubject } from "./events";
import { Subject } from "rxjs";
import { printCommunities } from "./utils";
import { Partials } from "discord.js";
import type { ClientOptions } from "discord.js";
import { botEnv } from "@answeroverflow/env/bot";

declare module "@sapphire/framework" {
  interface Container {
    messageHistory: LRUCache<
      string,
      {
        history: React.ReactNode[];
        setHistory: (node: React.ReactNode[]) => void;
      }
    >;
    events: AOEventSubject;
  }
}

function getLogLevel() {
  if (botEnv.NODE_ENV === "test") return LogLevel.None;
  return LogLevel.Info;
}

export function createClient(override: Partial<ClientOptions> = {}) {
  return new SapphireClient({
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
      "MessageContent",
    ],
    partials: [
      Partials.Channel,
      Partials.Message,
      Partials.GuildMember,
      Partials.Reaction,
      Partials.User,
    ],
    // @ts-ignore
    hmr: {
      enabled: botEnv.NODE_ENV === "development",
    },
    api: {
      automaticallyConnect: botEnv.NODE_ENV !== "test", // TODO: Bit of a hack? No point starting API during testing but would be good to verify it
    },
    ...override,
  });
}

export const login = async (client: SapphireClient) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call,@typescript-eslint/no-var-requires,n/no-extraneous-require
  require("dotenv").config();
  try {
    container.events = new Subject();
    client.logger.info("LOGGING IN");
    client.logger.info(`NODE_ENV: ${botEnv.NODE_ENV}`);
    client.logger.info(`DEPLOYMENT ENV: ${botEnv.NEXT_PUBLIC_DEPLOYMENT_ENV}`);
    client.logger.info(`DISCORD_ID: ${botEnv.DISCORD_CLIENT_ID}`);

    await client.login(botEnv.DISCORD_TOKEN);
    client.addListener(Events.ClientReady, () => {
      if (botEnv.PRINT_COMMUNITIES) {
        printCommunities(client); // TODO: Make a listener
      }
    });
    client.logger.info("LOGGED IN");
    client.logger.info(
      `LOGGED IN AS: ${client.user?.displayName ?? "UNKNOWN"}`
    );
    container.messageHistory = new LRUCache<
      string,
      {
        history: React.ReactNode[];
        setHistory: (node: React.ReactNode[]) => void;
      }
    >({
      max: 100,
      // 10 minute ttl
      ttl: 1000 * 60 * 10,
    });
  } catch (error) {
    client.logger.fatal(error);
    await client.destroy();
    throw error;
  }
};
