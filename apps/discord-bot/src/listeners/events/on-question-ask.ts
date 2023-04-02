import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { trackServerSideEvent } from '@answeroverflow/analytics';
import {
	toAOAnalyticsChannel,
	toAOAnalyticsServer,
	toAOAnalyticsThread,
} from '~discord-bot/utils/conversions';
import { findServerById, getDefaultServerWithFlags } from '@answeroverflow/db';

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
					trackServerSideEvent('Question Asked', {
						'Answer Overflow Account Id': thread.ownerId!,
						...toAOAnalyticsServer({
							guild: thread.guild,
							guildInDb:
								serverSettings || getDefaultServerWithFlags(thread.guild),
						}),
						...toAOAnalyticsChannel(channelSettings),
						...toAOAnalyticsThread(thread),
					});
				});
			}
		});
	}
}
