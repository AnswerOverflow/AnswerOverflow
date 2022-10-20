import { ApplyOptions, RequiresClientPermissions, RequiresDMContext, RequiresGuildContext } from '@sapphire/decorators';
import { send } from '@sapphire/plugin-editable-commands';
import { Subcommand } from '@sapphire/plugin-subcommands';
import { Message, MessageEmbed } from 'discord.js';

@ApplyOptions<Subcommand.Options>({
	aliases: ['cwd'],
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

	@RequiresClientPermissions('EMBED_LINKS') // This sub-command requires the bot to have EMBED_LINKS permission because it sends a MessageEmbed
	public async messageAdd(message: Message) {
		const embed = new MessageEmbed() //
			.setColor('#3986E4')
			.setDescription('Added!')
			.setTitle('Configuration Log')
			.setTimestamp();

		return send(message, { embeds: [embed] });
	}

	@RequiresGuildContext((message: Message) => send(message, 'This sub-command can only be used in servers'))
	public async messageRemove(message: Message) {
		return send(message, 'Removing!');
	}

	@RequiresDMContext((message: Message) => send(message, 'This sub-command can only be used in DMs'))
	public async messageReset(message: Message) {
		return send(message, 'Resetting!');
	}
}
