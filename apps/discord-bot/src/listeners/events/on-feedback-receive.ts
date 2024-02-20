import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class FeedbackReceiveListener extends Listener<Events.ClientReady> {
	public run() {}
}
