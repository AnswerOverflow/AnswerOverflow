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
		this.container.events.subscribe(async (event) => {
			if (event.action !== 'questionAsked') {
				return;
			}
			try {
				await sendMarkSolutionInstructionsInThread(
					event.data.raw[0],
					event.data.raw[1],
					event.data.channelSettings,
					event.data.questionAsker,
					event.data.question,
				);
			} catch (error) {
				if (error instanceof SendMarkSolutionInstructionsError) {
					console.error(
						'Expected error in SendMarkSolutionInstructions:',
						error,
					);
					return;
				}
				console.error(
					'Unexpected error in SendMarkSolutionInstructions:',
					error,
				);
				return;
			}
		});
	}
}
