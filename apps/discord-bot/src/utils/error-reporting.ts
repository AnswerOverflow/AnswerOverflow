import {
	captureException,
	setContext,
	setUser,
} from "@packages/observability/sentry";
import type {
	ButtonInteraction,
	ChatInputCommandInteraction,
	Message,
	ModalSubmitInteraction,
} from "discord.js";
import { Effect } from "effect";

type DiscordContext = {
	guildId?: string | null;
	channelId?: string | null;
	userId?: string;
	username?: string;
	command?: string;
	event?: string;
	messageId?: string;
};

export const setDiscordContext = (context: DiscordContext) => {
	if (context.userId) {
		setUser({ id: context.userId, username: context.username });
	}
	setContext("discord", {
		guildId: context.guildId,
		channelId: context.channelId,
		command: context.command,
		event: context.event,
		messageId: context.messageId,
	});
};

export const setInteractionContext = (
	interaction:
		| ChatInputCommandInteraction
		| ButtonInteraction
		| ModalSubmitInteraction,
) => {
	setDiscordContext({
		guildId: interaction.guildId,
		channelId: interaction.channelId,
		userId: interaction.user.id,
		username: interaction.user.username,
		command: "commandName" in interaction ? interaction.commandName : undefined,
	});
};

export const setMessageContext = (message: Message) => {
	setDiscordContext({
		guildId: message.guildId,
		channelId: message.channelId,
		userId: message.author.id,
		username: message.author.username,
		messageId: message.id,
	});
};

export const catchAllWithReport = <E, A, R, E2>(
	handler: (error: E) => Effect.Effect<A, E2, R>,
) => {
	return <R2>(effect: Effect.Effect<A, E, R2>): Effect.Effect<A, E2, R | R2> =>
		effect.pipe(
			Effect.tapError((error) =>
				Effect.sync(() => {
					captureException(error);
				}),
			),
			Effect.catchAll(handler),
		);
};

export const catchAllSilentWithReport = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | undefined, never, R> =>
	effect.pipe(
		Effect.tapError((error) =>
			Effect.sync(() => {
				captureException(error);
			}),
		),
		Effect.catchAll(() => Effect.succeed(undefined)),
	);

export const catchAllSucceedNullWithReport = <A, E, R>(
	effect: Effect.Effect<A, E, R>,
): Effect.Effect<A | null, never, R> =>
	effect.pipe(
		Effect.tapError((error) =>
			Effect.sync(() => {
				captureException(error);
			}),
		),
		Effect.catchAll(() => Effect.succeed(null)),
	);

export const reportError = (error: unknown, context?: DiscordContext) => {
	if (context) {
		setDiscordContext(context);
	}
	captureException(error);
};
