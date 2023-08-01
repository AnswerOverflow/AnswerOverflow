import type { RendererableInteractions } from '@answeroverflow/discordjs-react';
import type {
	ChatInputCommandSuccessPayload,
	Command,
	ContextMenuCommandSuccessPayload,
	MessageCommandSuccessPayload,
} from '@sapphire/framework';
import { container } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { cyan } from 'colorette';
import type { APIUser } from 'discord-api-types/v9';
import {
	Guild,
	Message,
	EmbedBuilder,
	User,
	type GuildTextBasedChannel,
	Client,
} from 'discord.js';
import type { ReactNode } from 'react';
import { LOADING_MESSAGES } from './constants';
import { sharedEnvs } from '@answeroverflow/env/shared';

export function getCommandIds(ids: {
	local?: string | string[];
	production?: string | string[];
	staging?: string | string[];
}): string[] {
	const { local, production, staging } = ids;

	switch (sharedEnvs.NEXT_PUBLIC_DEPLOYMENT_ENV) {
		case 'production':
			if (!production) return [];
			return Array.isArray(production) ? production : [production];
		case 'staging':
			if (!staging) return [];
			return Array.isArray(staging) ? staging : [staging];
		case 'local':
			if (!local) return [];
			return Array.isArray(local) ? local : [local];
		case 'ci':
			return [];
	}
}

/**
 * Picks a random item from an array
 * @param array The array to pick a random item from
 * @example
 * const randomEntry = pickRandom([1, 2, 3, 4]) // 1
 */
export function pickRandom<T>(array: readonly T[]): T {
	const { length } = array;
	return array[Math.floor(Math.random() * length)]!;
}

/**
 * Sends a loading message to the current channel
 * @param message The message data for which to send the loading message
 */
export function sendLoadingMessage(message: Message): Promise<typeof message> {
	return send(message, {
		embeds: [
			new EmbedBuilder()
				.setDescription(pickRandom(LOADING_MESSAGES))
				.setColor('#FF0000'),
		],
	});
}

export function logSuccessCommand(
	payload:
		| ContextMenuCommandSuccessPayload
		| ChatInputCommandSuccessPayload
		| MessageCommandSuccessPayload,
): void {
	let successLoggerData: ReturnType<typeof getSuccessLoggerData>;

	if ('interaction' in payload) {
		successLoggerData = getSuccessLoggerData(
			payload.interaction.guild,
			payload.interaction.user,
			payload.command,
		);
	} else {
		successLoggerData = getSuccessLoggerData(
			payload.message.guild,
			payload.message.author,
			payload.command,
		);
	}

	container.logger.debug(
		`${successLoggerData.shard} - ${successLoggerData.commandName} ${successLoggerData.author} ${successLoggerData.sentAt}`,
	);
}

export function getSuccessLoggerData(
	guild: Guild | null,
	user: User,
	command: Command,
) {
	const shard = getShardInfo(guild?.shardId ?? 0);
	const commandName = getCommandInfo(command);
	const author = getAuthorInfo(user);
	const sentAt = getGuildInfo(guild);

	return { shard, commandName, author, sentAt };
}

function getShardInfo(id: number) {
	return `[${cyan(id.toString())}]`;
}

function getCommandInfo(command: Command) {
	return cyan(command.name);
}

function getAuthorInfo(author: User | APIUser) {
	return `${author.username}[${cyan(author.id)}]`;
}

function getGuildInfo(guild: Guild | null) {
	if (guild === null) return 'Direct Messages';
	return `${guild.name}[${cyan(guild.id)}]`;
}

export function ephemeralReply(
	content: ReactNode,
	interaction: RendererableInteractions,
) {
	return container.discordJSReact.ephemeralReply(interaction, content);
}

export type RootChannel = NonNullable<ReturnType<typeof getRootChannel>>;
export function getRootChannel(channel: GuildTextBasedChannel) {
	if (channel.isVoiceBased()) return undefined;
	if (!channel.isTextBased()) return undefined;
	if (channel.isThread()) {
		if (!channel.parent) {
			return undefined;
		}
		return channel.parent;
	}
	return channel;
}

/**
 * Util to remove all discord markdown characters from a string
 * @param text Input string to process
 * @returns string with all discord markdown characters removed
 */
export function removeDiscordMarkdown(text: string) {
	return text.replace(/(\*|_|~|`)/g, '');
}

export function isHumanMessage(message: Message) {
	if (message.author.bot) return false;
	if (message.author.system) return false;
	return true;
}

export function hoursToMs(hours: number) {
	return hours * 60 * 60 * 1000;
}

export function printCommunities(client: Client) {
	const communities = client.guilds.cache.values();
	const communitiesByMemberCount = Array.from(communities).sort(
		(a, b) => b.memberCount - a.memberCount,
	);
	const totalMemberCount = communitiesByMemberCount.reduce(
		(acc, community) => acc + community.memberCount,
		0,
	);
	container.logger.info(
		`Total member count of all communities: ${totalMemberCount}`,
	);
	communitiesByMemberCount.forEach((community) => {
		container.logger.info({
			name: community.name,
			id: community.id,
			memberCount: community.memberCount,
			icon: community.iconURL({
				forceStatic: true,
			}),
		});
	});
}
