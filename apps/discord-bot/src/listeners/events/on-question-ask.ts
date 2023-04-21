import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { ChannelType, Events } from 'discord.js';
import { findServerById, getDefaultServerWithFlags } from '@answeroverflow/db';
import {
	channelWithDiscordInfoToAnalyticsData,
	memberToAnalyticsUser,
	messageToAnalyticsMessage,
	serverWithDiscordInfoToAnalyticsData,
	threadWithDiscordInfoToAnalyticsData,
	trackDiscordEvent,
} from '~discord-bot/utils/analytics';

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
			const firstMessage = await thread.fetchStarterMessage();
			if (!firstMessage) {
				this.container.logger.warn(
					`Thread ${thread.id} was created but no message was found.`,
				);
				return;
			}

			const questionAsker =
				thread.guild.members.cache.get(firstMessage.author.id) ||
				(await thread.guild.members.fetch(firstMessage.author.id));
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
							serverWithSettings:
								server || getDefaultServerWithFlags(thread.guild),
						}),
						...channelWithDiscordInfoToAnalyticsData({
							answerOverflowChannel: channelSettings,
							discordChannel: thread.parent!, // If we have channel settings, this channel must exist
						}),
						...threadWithDiscordInfoToAnalyticsData({
							thread,
						}),
						...memberToAnalyticsUser('Question Asker', questionAsker),
						...messageToAnalyticsMessage('Question', firstMessage),
					};
				});
			}
		});
	}
}
