import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { findServerById, getDefaultServerWithFlags } from '@answeroverflow/db';
import {
	channelWithDiscordInfoToAnalyticsData,
	serverWithDiscordInfoToAnalyticsData,
	threadWithDiscordInfoToAnalyticsData,
	trackDiscordEvent,
} from '~discord-bot/utils/analytics';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class QuestionAskedListener extends Listener<Events.ClientReady> {
	public run() {
		this.container.events.subscribe((event) => {
			if (event.action !== 'threadCreate') {
				return;
			}
			const { channelSettings } = event.data;
			const thread = event.data.raw[0];
			if (
				channelSettings.flags.indexingEnabled ||
				channelSettings.flags.markSolutionEnabled
			) {
				this.container.events.next({
					action: 'questionAsked',
					data: event.data,
				});
				void findServerById(channelSettings.serverId).then((serverSettings) => {
					trackDiscordEvent('Question Asked', {
						'Answer Overflow Account Id': thread.ownerId!,
						...serverWithDiscordInfoToAnalyticsData({
							guild: thread.guild,
							serverWithSettings:
								serverSettings || getDefaultServerWithFlags(thread.guild),
						}),
						...channelWithDiscordInfoToAnalyticsData({
							answerOverflowChannel: channelSettings,
							discordChannel: thread.parent!, // If we have channel settings, this channel must exist
						}),
						...threadWithDiscordInfoToAnalyticsData({
							thread,
						}),
					});
				});
			}
		});
	}
}
