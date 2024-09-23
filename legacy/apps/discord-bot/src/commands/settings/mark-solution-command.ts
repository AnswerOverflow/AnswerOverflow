import { ApplyOptions } from '@sapphire/decorators';
import { type ChatInputCommand, Command } from '@sapphire/framework';
import {
	ActionRowBuilder,
	ApplicationCommandType,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ContextMenuCommandInteraction,
	MessageActionRowComponentBuilder,
} from 'discord.js';
import { upsertMessage } from '@answeroverflow/db/src/message-node';

import {
	findChannelMessagesById,
	findFullMessageById,
	findServerById,
} from '@answeroverflow/db';
import { indexTextBasedChannel } from '../../domains/indexing';
import {
	markAsSolved,
	MarkSolutionError,
	checkIfCanMarkSolution,
	makeMarkSolutionResponse,
} from '../../domains/mark-solution';
import {
	trackDiscordEvent,
	memberToAnalyticsUser,
} from '../../utils/analytics';
import { toAOMessage } from '../../utils/conversions';
import { getCommandIds } from '../../utils/utils';

@ApplyOptions<Command.Options>({
	runIn: ['GUILD_ANY'],
})
export class MarkSolution extends Command {
	public override registerApplicationCommands(
		registry: ChatInputCommand.Registry,
	) {
		const ids = getCommandIds({
			local: '1073363502732955739',
			staging: '1081235688038613072',
			production: '999153895114821692',
		});
		registry.registerContextMenuCommand(
			{
				name: '✅ Mark Solution',
				type: ApplicationCommandType.Message,
				dmPermission: false,
			},
			{
				idHints: ids,
			},
		);
	}
	public override async contextMenuRun(
		interaction: ContextMenuCommandInteraction,
	) {
		if (!interaction.channel) return;
		const targetMessage = await interaction.channel.messages.fetch(
			interaction.targetId,
		);
		if (!targetMessage) return;
		if (!interaction.member) return;
		const member = interaction.guild?.members.cache.get(interaction.user.id);
		let errorStatus = undefined;
		try {
			const { embed, components } = await markAsSolved(
				targetMessage,
				interaction.user,
			);
			await interaction.reply({
				embeds: [embed],
				components: components ? [components] : undefined,
				ephemeral: false,
			});
		} catch (error) {
			if (error instanceof MarkSolutionError) {
				if (
					error.reason === 'ALREADY_SOLVED_VIA_EMBED' ||
					error.reason === 'ALREADY_SOLVED_VIA_TAG' ||
					error.reason === 'ALREADY_SOLVED_VIA_EMOJI'
				) {
					const { channelSettings } = await checkIfCanMarkSolution(
						targetMessage,
						interaction.user,
						true,
					);
					if (targetMessage.channel.isDMBased()) {
						return;
					}
					const reply = await interaction.reply({
						content:
							'This thread is already marked as solved, would you like to change the solution to this message?',
						ephemeral: true,
						components: [
							new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
								new ButtonBuilder({
									label: 'Yes',
									style: ButtonStyle.Secondary,
									custom_id: 'change-solution',
									type: ComponentType.Button,
								}),
							),
						],
					});
					const buttonClick = await reply.awaitMessageComponent({
						componentType: ComponentType.Button,
						time: 60 * 1000, // 5 minutes (more than enough time)
						filter: (i) => i.user.id === interaction.user.id,
					});
					await buttonClick.reply({
						content: 'The solution has been changed.',
						ephemeral: true,
					});

					const botMessages = await findChannelMessagesById(
						targetMessage.channel.id,
						{
							authorId: interaction.client.id!,
						},
					);

					const toDelete = botMessages.filter((m) =>
						m.embeds?.find((e) =>
							e.description?.includes(
								'Thank you for marking this question as solved',
							),
						),
					);
					await Promise.all(
						toDelete.map((m) => targetMessage.channel.messages.delete(m.id)),
					);

					const firstMessage = await targetMessage.channel.messages.fetch(
						targetMessage.channelId,
					);

					const inDb = await findFullMessageById(targetMessage.channelId);
					if (inDb && inDb.solutions.length > 0) {
						for await (const solution of inDb.solutions) {
							await upsertMessage({
								...solution,
								questionId: null,
							});
							const inDiscord = await targetMessage.channel.messages.fetch(
								solution.id,
							);
							try {
								await inDiscord.reactions
									.resolve('✅')
									?.users.remove(inDiscord.client.id!);
							} catch (error) {
								console.error(error);
							}
						}
					}

					await upsertMessage({
						...(await toAOMessage(targetMessage)),
						questionId: targetMessage.channel.id,
					});

					const aoServer = await findServerById(targetMessage.guildId!);
					const { embed, components } = makeMarkSolutionResponse({
						question: firstMessage,
						solution: targetMessage,
						server: aoServer!,
						settings: channelSettings,
					});
					await interaction.channel?.send({
						embeds: [embed],
						components: components ? [components] : undefined,
					});

					await indexTextBasedChannel(targetMessage.channel);
				} else {
					await interaction.reply({ content: error.message, ephemeral: true });
					errorStatus = error.reason;
				}
			} else throw error;
		}
		trackDiscordEvent('Mark Solution Application Command Used', {
			Status: errorStatus ?? 'Success',
			...memberToAnalyticsUser('User', member!),
			'Answer Overflow Account Id': interaction.user.id,
		});
	}
}
