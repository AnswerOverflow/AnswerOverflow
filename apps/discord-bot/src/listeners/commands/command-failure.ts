import { ApplyOptions } from '@sapphire/decorators';
import {
	ChatInputCommandErrorPayload,
	CommandDoesNotHaveChatInputCommandHandlerPayload,
	container,
	Events,
	UnknownChatInputCommandPayload,
} from '@sapphire/framework';
import { Listener } from '@sapphire/framework';
import type { Interaction } from 'discord.js';
import * as Sentry from '@sentry/node';
import { onceTimeStatusHandler } from '~discord-bot/utils/trpc';

function makeErrorMessage(msg: string) {
	return `Sorry! ${msg}. We've been notified of the problem and are looking into it. \n\nYou can try dismissing this and rerunning the command in the meantime.`;
}

async function handleError<T extends {}>(opts: {
	interaction: Interaction;
	userFacingMessage: string;
	sentryMessage: string;
	sentryPayload: T;
}) {
	const { interaction, userFacingMessage, sentryMessage, sentryPayload } = opts;
	if (interaction.isChatInputCommand() || interaction.isMessageComponent()) {
		await onceTimeStatusHandler(
			interaction,
			makeErrorMessage(userFacingMessage),
		);
	}
	container.logger.error(sentryMessage, sentryPayload);
	Sentry.withScope((scope) => {
		scope.setExtras(sentryPayload);
		Sentry.captureMessage(sentryMessage);
	});
}

@ApplyOptions<Listener.Options>({
	event: Events.CommandDoesNotHaveChatInputCommandHandler,
	name: 'CommandDoesNotHaveChatInputCommandHandlerListener',
})
export class CommandDoesNotHaveChatInputCommandHandlerListener extends Listener<
	typeof Events.CommandDoesNotHaveChatInputCommandHandler
> {
	public async run(payload: CommandDoesNotHaveChatInputCommandHandlerPayload) {
		await handleError({
			interaction: payload.interaction,
			userFacingMessage: 'This command has no slash command response',
			sentryMessage: 'Command does not have chat input command handler',
			sentryPayload: payload,
		});
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.ChatInputCommandError,
	name: 'ChatInputCommandErrorListener',
})
export class ChatInputCommandErrorListener extends Listener<
	typeof Events.ChatInputCommandError
> {
	public async run(payload: ChatInputCommandErrorPayload) {
		await handleError({
			interaction: payload.interaction,
			userFacingMessage: 'We encountered an error while running your command',
			sentryMessage: 'Chat input command error',
			sentryPayload: payload,
		});
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.UnknownChatInputCommand,
	name: 'UnknownChatInputCommandEvent',
})
export class UnknownChatInputCommandEvent extends Listener<
	typeof Events.UnknownChatInputCommand
> {
	public async run(payload: UnknownChatInputCommandPayload) {
		await handleError({
			interaction: payload.interaction,
			sentryMessage: 'Unknown chat input command',
			sentryPayload: payload,
			userFacingMessage:
				'We could not find the command you were trying to run. It may be a new command that is still being rolled out, or a recently removed command',
		});
	}
}

@ApplyOptions<Listener.Options>({
	event: Events.InteractionCreate,
	name: 'InteractionNotRepliedListener',
})
export class InteractionNotRepliedListener extends Listener<
	typeof Events.InteractionCreate
> {
	public run(intr: Interaction) {
		if (intr.isAutocomplete()) {
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			setTimeout(async () => {
				if (intr.responded) return;
				await handleError({
					interaction: intr,
					sentryMessage: 'Autocomplete interaction timed out',
					sentryPayload: intr,
					userFacingMessage: 'The autocomplete interaction timed out',
				});
			}, 10000);
			return;
		}
		// Capture any events that haven't been replied to after 30 seconds
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		const deferredTimeout = setTimeout(async () => {
			if (intr.replied) return;
			if (intr.deferred && intr.replied) return;
			await handleError({
				interaction: intr,
				sentryMessage: 'Deferred interaction timed out',
				sentryPayload: intr,
				userFacingMessage: 'The deferred interaction timed out',
			});
		}, 30000);

		// Capture any interaction that hasn't been replied / deferred to after 10 seconds
		// eslint-disable-next-line @typescript-eslint/no-misused-promises
		setTimeout(async () => {
			if (intr.replied || intr.deferred) {
				return;
			}
			clearTimeout(deferredTimeout);
			await handleError({
				interaction: intr,
				sentryMessage: 'Interaction timed out',
				sentryPayload: intr,
				userFacingMessage: 'The interaction timed out',
			});
		}, 10000);
	}
}
