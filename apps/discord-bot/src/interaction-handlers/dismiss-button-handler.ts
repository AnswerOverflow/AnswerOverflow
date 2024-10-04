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
			throw error;
		}
	}

	public async run(
		interaction: ButtonInteraction,
		data: InteractionHandler.ParseResult<this>,
	) {
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
				}
			}
		});
	}
}
