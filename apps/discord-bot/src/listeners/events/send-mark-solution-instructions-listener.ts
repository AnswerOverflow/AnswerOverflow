import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { ThreadChannel } from 'discord.js';
import { Events } from 'discord.js';
import {
	SendMarkSolutionInstructionsError,
	sendMarkSolutionInstructionsInThread,
} from '~discord-bot/domains/send-mark-solution-instructions';

@ApplyOptions<Listener.Options>({ event: Events.ThreadCreate })
export class SendMarkSolutionInstructionsOnThreadCreate extends Listener {
	public async run(thread: ThreadChannel, newlyCreated: boolean) {
		try {
			await sendMarkSolutionInstructionsInThread(thread, newlyCreated);
		} catch (error) {
			if (error instanceof SendMarkSolutionInstructionsError) return;
			throw error;
		}
	}
}
