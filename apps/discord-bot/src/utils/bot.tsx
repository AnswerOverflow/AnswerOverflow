import { container, LogLevel, SapphireClient } from "@sapphire/framework";
import { ClientOptions, Partials } from "discord.js";

import "~discord-bot/utils/setup";
import { DiscordJSReact, TestDiscordJSReact } from "@answeroverflow/discordjs-react";
import { Router } from "~discord-bot/components/primitives";
import React from "react";
import LRUCache from "lru-cache";
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
			level: getLogLevel()
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
			"MessageContent"
		],
		partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.Reaction],
		loadMessageCommandListeners: true,
		hmr: {
			enabled: process.env.NODE_ENV === "development"
		},
		api: {
			automaticallyConnect: process.env.NODE_ENV !== "test" // TODO: Bit of a hack? No point starting API during testing but would be good to verify it
		},
		...override
	});
}

export const login = async (client: SapphireClient) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
	require("dotenv").config();
	try {
		client.logger.info("LOGGING IN");
		client.logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
		client.logger.info(`DISCORD_ID: ${process.env.DISCORD_CLIENT_ID ?? "UNKNOWN"}`);
		await client.login(process.env.DISCORD_TOKEN);
		client.logger.info("LOGGED IN");
		client.logger.info(`LOGGED IN AS: ${client.user?.username ?? "UNKNOWN"}`);
		const config: DiscordJSReact["config"] = {
			// @ts-ignore
			wrapper: ({ children }) => <Router>{children}</Router>
		};
		container.discordJSReact =
			process.env.NODE_ENV === "test"
				? new TestDiscordJSReact(client, config)
				: new DiscordJSReact(client, config);
		container.messageHistory = new LRUCache<
			string,
			{
				history: React.ReactNode[];
				setHistory: (node: React.ReactNode[]) => void;
			}
		>({
			max: 100,
			// 10 minute ttl
			ttl: 1000 * 60 * 10
		});
	} catch (error) {
		client.logger.fatal(error);
		client.destroy();
		process.exit(1);
	}
};
