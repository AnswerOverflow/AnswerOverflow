import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { provideConsentOnForumChannelMessage } from '~discord-bot/domains/manage-account';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class ForumPostGuideliensConsent extends Listener {
	public run() {
		this.container.events.subscribe((event) => {
			if (event.action !== 'messageCreate') return;
			void provideConsentOnForumChannelMessage(
				event.data.raw[0],
				event.data.channelSettings,
			);
		});
	}
}
