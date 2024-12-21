import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import { provideConsentOnForumChannelMessage } from '../../domains/manage-account';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class ForumPostGuidelinesConsent extends Listener {
	public run() {
		this.container.events.subscribe((event) => {
			if (event.action !== 'messageCreate') return;
			try {
				void provideConsentOnForumChannelMessage(
					event.data.raw[0],
					event.data.channelSettings,
				);
			} catch (error) {
				console.error('Error processing forum post guidelines consent:', error);
			}
		});
	}
}
