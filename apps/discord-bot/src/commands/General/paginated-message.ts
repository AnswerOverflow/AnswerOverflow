import { ApplyOptions } from '@sapphire/decorators';
import { PaginatedMessage } from '@sapphire/discord.js-utilities';
import { Command } from '@sapphire/framework';
import type { Message } from 'discord.js';
import { MessageEmbed } from 'discord.js';
import { sendLoadingMessage } from '../../lib/utils';

@ApplyOptions<Command.Options>({
	aliases: ['pm'],
	description: 'A command that uses paginated messages.',
	generateDashLessAliases: true
})
export class UserCommand extends Command {
	public async messageRun(message: Message) {
		const response = await sendLoadingMessage(message);

		const paginatedMessage = new PaginatedMessage({
			template: new MessageEmbed()
				.setColor('#FF0000')
				// Be sure to add a space so this is offset from the page numbers!
				.setFooter({ text: ' footer after page numbers' })
		});

		paginatedMessage
			.addPageEmbed((embed) =>
				embed //
					.setDescription('This is the first page')
					.setTitle('Page 1')
			)
			.addPageBuilder((builder) =>
				builder //
					.setContent('This is the second page')
					.setEmbeds([new MessageEmbed().setTimestamp()])
			);

		await paginatedMessage.run(response, message.author);
		return response;
	}
}
