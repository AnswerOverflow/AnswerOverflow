import {
	InteractionHandler,
	InteractionHandlerTypes,
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import {
	ConsentButtonInteractionParseError,
	parseConsentButtonInteraction,
	updateUserConsent,
} from '../domains/manage-account';
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

	public override async parse(interaction: ButtonInteraction) {
		try {
			const source = parseConsentButtonInteraction(interaction.customId);
			await interaction.deferReply({
				ephemeral: true,
			});
			return this.some({ source });
		} catch (error) {
			if (error instanceof ConsentButtonInteractionParseError) {
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
			const member = await interaction.guild?.members.fetch(
				interaction.user.id,
			);
			if (!member) {
				this.container.logger.error(
					'Member not found in consent button interaction',
				);
				return;
			}

			await updateUserConsent({
				canPubliclyDisplayMessages: true,
				consentSource: data.source,
				member,
				Error: (_, msg) => oneTimeStatusHandler(interaction, msg),
				Ok: () =>
					oneTimeStatusHandler(
						interaction,
						'You have provided consent to display your messages publicly.',
					),
			});
		} catch (error) {
			this.container.logger.error('Error in consent button handler:', error);
			await oneTimeStatusHandler(
				interaction,
				'An error occurred while processing your consent. Please try again later.',
			).catch((e) =>
				this.container.logger.error('Failed to send error message to user:', e),
			);
		}
	}
}
