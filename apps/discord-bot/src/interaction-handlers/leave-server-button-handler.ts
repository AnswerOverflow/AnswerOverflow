import {
	InteractionHandler,
	InteractionHandlerTypes,
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { parseLeaveButtonId } from '../domains/leave-server-button';
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
			const guildId = parseLeaveButtonId(interaction.customId);
			return this.some({ guildId });
		} catch (error) {
			return this.none();
		}
	}

	public async run(
		interaction: ButtonInteraction,
		data: InteractionHandler.ParseResult<this>,
	) {
		try {
			// Only allow Rhys to trigger leaving via this button
			const RHYS_ID = '523949187663134754';
			if (interaction.user.id !== RHYS_ID) {
				await oneTimeStatusHandler(
					interaction,
					'You are not authorized to perform this action.',
				);
				return;
			}
			const guild = await this.container.client.guilds.fetch(data.guildId);
			if (!guild) {
				await oneTimeStatusHandler(
					interaction,
					'This action can only be used inside a guild.',
				);
				return;
			}

			await guild.leave();
			await oneTimeStatusHandler(interaction, `Left server ${guild.name}`);
		} catch (error) {
			this.container.logger.error(
				'Error in leave server button handler:',
				error,
			);
			await oneTimeStatusHandler(
				interaction,
				'An error occurred while leaving the server.',
			);
		}
	}
}
