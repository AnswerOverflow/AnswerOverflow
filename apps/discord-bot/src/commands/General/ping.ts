import { ApplyOptions } from '@sapphire/decorators';
import { Command } from '@sapphire/framework';
import { send } from '@sapphire/plugin-editable-commands';
import { Message } from 'discord.js';
import { add } from 'core';
@ApplyOptions<Command.Options>({
	description: 'ping pong'
})
export class UserCommand extends Command {
	// Register slash and context menu command
	public override registerApplicationCommands(registry: Command.Registry) {
		// Register slash command
		registry.registerChatInputCommand({
			name: this.name,
			description: this.description
		});
		// Register context menu command available from any message
		registry.registerContextMenuCommand({
			name: this.name,
			type: 'MESSAGE'
		});
		// Register context menu command available from any user
		registry.registerContextMenuCommand({
			name: this.name,
			type: 'USER'
		});
	}

	// Message command
	public async messageRun(message: Message) {
		const msg = await send(message, 'Ping?');

		const content = `Pong!`;

		return send(message, content);
	}
	// slash command
	public async chatInputRun(interaction: Command.ChatInputInteraction) {
		const msg = await interaction.reply({ content: 'Ping?', fetchReply: true });
		const content = `Pong! ${add(1, 4)}`;

		return await interaction.editReply({
			content: content
		});
	}
	// context menu command
	public async contextMenuRun(interaction: Command.ContextMenuInteraction) {
		const msg = await interaction.reply({ content: 'Ping?', fetchReply: true });
		const createdTime = msg instanceof Message ? msg.createdTimestamp : Date.parse(msg.timestamp);

		const content = `Pong! Bot Latency ${Math.round(this.container.client.ws.ping)}ms. API Latency ${createdTime - interaction.createdTimestamp
			}ms.`;

		return await interaction.editReply({
			content: content
		});
	}
}
