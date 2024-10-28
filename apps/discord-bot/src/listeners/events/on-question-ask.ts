import { findServerById } from '@answeroverflow/core/server';
import { botEnv } from '@answeroverflow/env/bot';
import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType, DiscordAPIError, Events } from 'discord.js';
import {
	channelWithDiscordInfoToAnalyticsData,
	memberToAnalyticsUser,
	messageToAnalyticsMessage,
	serverWithDiscordInfoToAnalyticsData,
	threadWithDiscordInfoToAnalyticsData,
	trackDiscordEvent,
} from '../../utils/analytics';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class QuestionAskedListener extends Listener<Events.ClientReady> {
	public run() {
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		this.container.events.subscribe(async (event) => {
			if (event.action !== 'threadCreate') {
				return;
			}
			const { channelSettings } = event.data;
			const thread = event.data.raw[0];
			if (thread.type === ChannelType.PrivateThread) {
				return; // TODO: Support private threads?
			}
			/*
        Discord sends the threadCreate and messageCreate events at the same time, however, the threadCreate event can be received before the messageCreate event, resulting in the first message not being available yet.
       */
			const fetchAfterDelay = async (time: number) => {
				try {
					if (botEnv.NODE_ENV !== 'test')
						await new Promise((resolve) => setTimeout(resolve, time));
					return await thread.fetchStarterMessage();
				} catch (error) {
					if (!(error instanceof DiscordAPIError && error.status === 404))
						throw error;
					return null;
				}
			};

			const firstMessage =
				(await fetchAfterDelay(1000)) || (await fetchAfterDelay(10000));

			const questionAskerId = firstMessage?.author.id || thread.ownerId;

			const questionAsker =
				thread.guild.members.cache.get(questionAskerId!) ||
				(await thread.guild.members.fetch(questionAskerId!));
			if (
				channelSettings.flags.indexingEnabled ||
				channelSettings.flags.markSolutionEnabled
			) {
				this.container.events.next({
					action: 'questionAsked',
					data: {
						...event.data,
						questionAsker,
						question: firstMessage,
					},
				});
				trackDiscordEvent('Asked Question', async () => {
					const server = await findServerById(channelSettings.serverId);
					return {
						'Answer Overflow Account Id': questionAsker.id,
						...serverWithDiscordInfoToAnalyticsData({
							guild: thread.guild,
							serverWithSettings: server!,
						}),
						...channelWithDiscordInfoToAnalyticsData({
							answerOverflowChannel: channelSettings,
							discordChannel: thread.parent!, // If we have channel settings, this channel must exist
						}),
						...threadWithDiscordInfoToAnalyticsData({
							thread,
						}),
						...memberToAnalyticsUser('Question Asker', questionAsker),
						...(firstMessage &&
							messageToAnalyticsMessage('Question', firstMessage)),
					};
				});
			}
		});
	}
}
