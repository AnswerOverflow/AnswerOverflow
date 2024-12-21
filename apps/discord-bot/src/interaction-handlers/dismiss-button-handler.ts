import {
	InteractionHandler,
	InteractionHandlerTypes,
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import {
	DismissButtonInteractionParseError,
	DismissErrorError,
	dismissMessage,
	parseDismissButtonId,
} from '../domains/dismiss-button';
import { guildTextChannelOnlyInteraction } from '../utils/conditions';
import { oneTimeStatusHandler } from '../utils/trpc';

export class ButtonHandler extends InteractionHandler {
	public constructor(
		ctx: InteractionHandler.LoaderContext,
		options: InteractionHandler.Options,
	) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override parse(interaction: ButtonInteraction) {
		try {
			const allowedToDismissId = parseDismissButtonId(interaction.customId);
			return this.some({ allowedToDismissId });
		} catch (error) {
			if (error instanceof DismissButtonInteractionParseError) {
				return this.none();
			}
			return this.none();
		}
	}

	public async run(
		interaction: ButtonInteraction,
		data: InteractionHandler.ParseResult<this>,
	) {
		try {
			await guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
				try {
					await dismissMessage({
						allowedToDismissId: data.allowedToDismissId,
						dismisser: member,
						messageToDismiss: interaction.message,
					});
					await oneTimeStatusHandler(interaction, 'Dismissed message!');
				} catch (error) {
					if (error instanceof DismissErrorError) {
						await oneTimeStatusHandler(interaction, error.message);
					} else {
						this.container.logger.error(
							'Error in dismiss button handler:',
							error,
						);
						await oneTimeStatusHandler(
							interaction,
							'An unexpected error occurred while dismissing the message.',
						);
					}
				}
			});
		} catch (error) {
			this.container.logger.error('Error in guild text channel check:', error);
			await interaction.reply({
				content: 'This command can only be used in a guild text channel.',
				ephemeral: true,
			});
		}
	}
}
