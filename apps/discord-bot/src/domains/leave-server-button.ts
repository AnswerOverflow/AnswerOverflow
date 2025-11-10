import { ButtonBuilder, ButtonStyle, ComponentType } from 'discord.js';

export const LEAVE_BUTTON_LABEL = 'Leave Server';
export const LEAVE_ACTION_PREFIX = 'leave';

export function makeLeaveButton(guildId: string) {
	return new ButtonBuilder({
		label: LEAVE_BUTTON_LABEL,
		style: ButtonStyle.Danger,
		custom_id: `${LEAVE_ACTION_PREFIX}-${guildId}`,
		type: ComponentType.Button,
	});
}

export function parseLeaveButtonId(customId: string) {
	const split = customId.split('-');
	const action = split[0];
	const guildId = split[1];

	if (action !== LEAVE_ACTION_PREFIX) throw new Error('no-leave-prefix');
	if (!guildId) throw new Error('no-guild-id');
	return guildId;
}
