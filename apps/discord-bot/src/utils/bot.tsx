import {
	container,
	Events,
	LogLevel,
	SapphireClient,
} from '@sapphire/framework';

import '~discord-bot/utils/setup';
import {
	DiscordJSReact,
	TestDiscordJSReact,
} from '@answeroverflow/discordjs-react';
import { Router } from '~discord-bot/components/primitives';
import React from 'react';
import LRUCache from 'lru-cache';
import type { AOEventSubject } from './events';
import { Subject } from 'rxjs';
import { printCommunities } from './utils';
import { Partials } from 'discord.js';
import type { ClientOptions } from 'ws';

declare module '@sapphire/pieces' {
	interface Container {
		discordJSReact: DiscordJSReact;
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
	switch (process.env.NODE_ENV) {
		case 'development':
			return process.env.BOT_DEV_LOG_LEVEL
				? parseInt(process.env.BOT_DEV_LOG_LEVEL)
				: LogLevel.Debug;
		case 'test':
			return process.env.BOT_TEST_LOG_LEVEL
				? parseInt(process.env.BOT_TEST_LOG_LEVEL)
				: LogLevel.None;
		case 'production':
			return process.env.BOT_PROD_LOG_LEVEL
				? parseInt(process.env.BOT_PROD_LOG_LEVEL)
				: LogLevel.Debug;
		default:
			return LogLevel.Debug;
	}
}

export function createClient(override: Partial<ClientOptions> = {}) {
	return new SapphireClient({
		logger: {
			level: getLogLevel(),
		},
		shards: 'auto',
		intents: [
			'Guilds',
			'GuildMembers',
			'GuildBans',
			'GuildEmojisAndStickers',
			'GuildVoiceStates',
			'GuildMessages',
			'GuildMessageReactions',
			'DirectMessages',
			'DirectMessageReactions',
			'MessageContent',
		],
		partials: [
			Partials.Channel,
			Partials.Message,
			Partials.GuildMember,
			Partials.Reaction,
		],
		hmr: {
			enabled: process.env.NODE_ENV === 'development',
		},
		api: {
			automaticallyConnect: process.env.NODE_ENV !== 'test', // TODO: Bit of a hack? No point starting API during testing but would be good to verify it
		},
		...override,
	});
}

export const login = async (client: SapphireClient) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
	require('dotenv').config();
	try {
		container.events = new Subject();
		client.logger.info('LOGGING IN');
		client.logger.info(`NODE_ENV: ${process.env.NODE_ENV}`);
		client.logger.info(
			`DEPLOYMENT ENV: ${process.env.NEXT_PUBLIC_DEPLOYMENT_ENV!}`,
		);
		client.logger.info(
			`DISCORD_ID: ${process.env.DISCORD_CLIENT_ID ?? 'UNKNOWN'}`,
		);
		if (process.env.NEXT_PUBLIC_DEPLOYMENT_ENV === undefined) {
			throw new Error(
				'NEXT_PUBLIC_DEPLOYMENT_ENV is not defined, you must explicitly set it to "local", "staging", "ci" or "production"',
			);
		}

		await client.login(process.env.DISCORD_TOKEN);
		client.addListener(Events.ClientReady, () => {
			if (process.env.PRINT_COMMUNITIES) {
				printCommunities(client); // TODO: Make a listener
			}
		});
		client.logger.info('LOGGED IN');
		client.logger.info(`LOGGED IN AS: ${client.user?.username ?? 'UNKNOWN'}`);
		const config: DiscordJSReact['config'] = {
			// @ts-ignore
			wrapper: ({ children }) => <Router>{children}</Router>,
		};
		container.discordJSReact =
			process.env.NODE_ENV === 'test'
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
			ttl: 1000 * 60 * 10,
		});
	} catch (error) {
		client.logger.fatal(error);
		client.destroy();
		process.exit(1);
	}
};
