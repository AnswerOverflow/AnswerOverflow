import {
	InteractionHandler,
	InteractionHandlerTypes,
	type PieceContext,
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import {
	DismissButtonInteractionParseError,
	DismissErrorError,
	dismissMessage,
	parseDismissButtonId,
} from '~discord-bot/domains/dismiss-button';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';
import { oneTimeStatusHandler } from '~discord-bot/utils/trpc';

export class ButtonHandler extends InteractionHandler {
	public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
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
