import { ApplyOptions } from '@sapphire/decorators';
import { Listener } from '@sapphire/framework';
import type { ThreadChannel } from 'discord.js';
import { Events } from 'discord.js';
import { sendMarkSolutionInstructionsInThread } from '~discord-bot/domains/send-mark-solution-instructions';

@ApplyOptions<Listener.Options>({ event: Events.ThreadCreate })
export class SendMarkSolutionInstructionsOnThreadCreate extends Listener {
	public async run(thread: ThreadChannel, newlyCreated: boolean) {
		await sendMarkSolutionInstructionsInThread(thread, newlyCreated);
	}
}
