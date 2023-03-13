import {
	InteractionHandler,
	InteractionHandlerTypes,
	PieceContext,
} from '@sapphire/framework';
import type { ButtonInteraction } from 'discord.js';
import { CONSENT_SOURCES } from '@answeroverflow/api';
import {
	CONSENT_ACTION_PREFIX,
	updateUserConsent,
} from '~discord-bot/domains/manage-account';
import { onceTimeStatusHandler } from '~discord-bot/utils/trpc';

export class ButtonHandler extends InteractionHandler {
	public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
		super(ctx, {
			...options,
			interactionHandlerType: InteractionHandlerTypes.Button,
		});
	}

	public override async parse(interaction: ButtonInteraction) {
		const splitInteractionId = interaction.customId.split('-');
		const action = splitInteractionId[0];
		const source = splitInteractionId.slice(1).join('-');
		if (action !== CONSENT_ACTION_PREFIX) return this.none();
		if (!source) return this.none();
		if (!CONSENT_SOURCES.includes(source)) return this.none();
		await interaction.deferReply({
			ephemeral: true,
		});
		return this.some({ source });
	}

	public async run(
		interaction: ButtonInteraction,
		data: InteractionHandler.ParseResult<this>,
	) {
		const member = await interaction.guild?.members.fetch(interaction.user.id);
		if (!member) return;
		await updateUserConsent({
			canPubliclyDisplayMessages: true,
			consentSource: data.source,
			member,
			Error: (_, msg) => onceTimeStatusHandler(interaction, msg),
			Ok: () =>
				onceTimeStatusHandler(
					interaction,
					'You have provided consent to display your messages publicly.',
				),
		});
	}
}
