import type { GuildMember } from 'discord.js';
import type { Message } from 'discord.js';
import {
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	type PermissionResolvable,
} from 'discord.js';
import {
	trackDiscordEvent,
	memberToAnalyticsUser,
	messageToAnalyticsMessage,
} from '../utils/analytics';

export const DISMISS_BUTTON_LABEL = 'Dismiss';
export const DISMISS_ACTION_PREFIX = 'dismiss';

const dismissButtonErrorReasons = [
	'no-dismiss-prefix',
	'no-dismisser-id',
] as const;
export type DismissButtonErrorReason =
	(typeof dismissButtonErrorReasons)[number];
export class DismissButtonInteractionParseError extends Error {
	public constructor(public readonly reason: DismissButtonErrorReason) {
		super(`Dismiss button interaction parse error: ${reason}`);
	}
}

export function makeDismissButton(dismisserId: string) {
	return new ButtonBuilder({
		label: DISMISS_BUTTON_LABEL,
		style: ButtonStyle.Secondary,
		custom_id: `${DISMISS_ACTION_PREFIX}:${dismisserId}`,
		type: ComponentType.Button,
	});
}

export function parseDismissButtonId(customId: string) {
	const splitInteractionId = customId.split(':');
	const action = splitInteractionId[0];
	const dismisserId = splitInteractionId[1];
	if (action !== DISMISS_ACTION_PREFIX) {
		throw new DismissButtonInteractionParseError('no-dismiss-prefix');
	}
	if (!dismisserId) {
		throw new DismissButtonInteractionParseError('no-dismisser-id');
	}
	return dismisserId;
}

const dismissErrors = ['no-permissions', 'not-allowed-to-dismiss'];
export type DismissError = (typeof dismissErrors)[number];
export class DismissErrorError extends Error {
	public constructor(
		message: string,
		public readonly reason: DismissError,
	) {
		super(message);
	}
}

export const DISMISS_OVERRIDE_PERMISSIONS: PermissionResolvable[] = [
	'ManageChannels',
	'ManageMessages',
	'Administrator',
	'ManageGuild',
];

export const MISSING_PERMISSIONS_TO_DISMISS_ERROR_MESSAGE = `You are missing permissions to dismiss this message.\n\nOnly the person this message is replying to or someone with the following permissions can dismiss this message: \`${DISMISS_OVERRIDE_PERMISSIONS.join(
	', ',
)}\``;

export async function dismissMessage(input: {
	messageToDismiss: Message;
	dismisser: GuildMember;
	allowedToDismissId: string;
}) {
	const { messageToDismiss, dismisser, allowedToDismissId } = input;
	if (dismisser.id !== allowedToDismissId) {
		const hasOverridePermissions = dismisser.permissions.has(
			DISMISS_OVERRIDE_PERMISSIONS,
		);
		if (!hasOverridePermissions) {
			throw new DismissErrorError(
				MISSING_PERMISSIONS_TO_DISMISS_ERROR_MESSAGE,
				'not-allowed-to-dismiss',
			);
		}
	}
	await messageToDismiss.delete();
	trackDiscordEvent('Dismiss Button Clicked', {
		...memberToAnalyticsUser('User', dismisser),
		...messageToAnalyticsMessage('Message', messageToDismiss),
		'Answer Overflow Account Id': dismisser.id,
		'Dismissed Message Type': 'Mark Solution Instructions',
	});
}
