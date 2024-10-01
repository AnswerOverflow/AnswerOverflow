import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import { Events } from 'discord.js';
import {
	SendMarkSolutionInstructionsError,
	sendMarkSolutionInstructionsInThread,
} from '../../domains/send-mark-solution-instructions';

@ApplyOptions<Listener.Options>({ event: Events.ClientReady })
export class SendMarkSolutionInstructionsOnThreadCreate extends Listener<Events.ClientReady> {
	public run() {
		this.container.events.subscribe((event) => {
			if (event.action !== 'questionAsked') {
				return;
			}
			void sendMarkSolutionInstructionsInThread(
				event.data.raw[0],
				event.data.raw[1],
				event.data.channelSettings,
				event.data.questionAsker,
				event.data.question,
			).catch((error) => {
				if (error instanceof SendMarkSolutionInstructionsError) return;
				throw error;
			});
		});
	}
}
