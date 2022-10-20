import { ApplyOptions } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { Subcommand } from '@sapphire/plugin-subcommands';
import type { Message } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	aliases: ['cws'],
	description: 'A basic command with some subcommands',
	subcommands: [
		{
			name: 'add',
			messageRun: 'messageAdd'
		},
		{
			name: 'create',
			messageRun: 'messageAdd'
		},
		{
			name: 'remove',
			messageRun: 'messageRemove'
		},
		{
			name: 'reset',
			messageRun: 'messageReset'
		},
		{
			name: 'show',
			messageRun: 'messageShow',
			default: true
		}
	]
})
export class UserCommand extends Subcommand {
	// Anyone should be able to view the result, but not modify
	public async messageShow(message: Message) {
		return send(message, 'Showing!');
	}

	public async messageAdd(message: Message) {
		return send(message, 'Adding!');
	}

	public async messageRemove(message: Message) {
		return send(message, 'Removing!');
	}

	public async messageReset(message: Message) {
		return send(message, 'Resetting!');
	}
}
