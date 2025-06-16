import {
	Events,
	LogLevel,
	SapphireClient,
	container,
} from '@sapphire/framework';
import '../utils/setup';
import { botEnv } from '@answeroverflow/env/bot';
import { Partials } from 'discord.js';
import type { ClientOptions } from 'discord.js';
import { Subject } from 'rxjs';
import type { AOEventSubject } from './events';
import { printCommunities } from './utils';

declare module '@sapphire/framework' {
	interface Container {
		events: AOEventSubject;
	}
}

function getLogLevel() {
	if (botEnv.NODE_ENV === 'test') return LogLevel.None;
	if (botEnv.NODE_ENV === 'development') return LogLevel.Debug;
	return LogLevel.Trace;
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
			Partials.User,
		],
		...override,
	});
}

export const login = async (client: SapphireClient) => {
	require('dotenv').config();
	try {
		container.events = new Subject();
		client.logger.info('LOGGING IN');
		client.logger.info(`NODE_ENV: ${botEnv.NODE_ENV}`);
		client.logger.info(`DEPLOYMENT ENV: ${botEnv.NEXT_PUBLIC_DEPLOYMENT_ENV}`);
		client.logger.info(`DISCORD_ID: ${botEnv.NEXT_PUBLIC_DISCORD_CLIENT_ID}`);

		await client.login(botEnv.DISCORD_TOKEN);
		client.addListener(Events.ClientReady, () => {
			if (botEnv.PRINT_COMMUNITIES) {
				printCommunities(client); // TODO: Make a listener
			}
		});
		client.logger.info('LOGGED IN');
		client.logger.info(
			`LOGGED IN AS: ${client.user?.displayName ?? 'UNKNOWN'}`,
		);
	} catch (error) {
		client.logger.error(error);
		// await client.destroy();
		// throw error;
	}
};
