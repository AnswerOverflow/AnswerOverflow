import type { ButtonInteraction, GuildMember } from "discord.js";
import { Message, MessageFlags, PermissionFlagsBits } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord, UnknownDiscordError } from "../core/discord-service";
import { trackDismissButtonClicked } from "../utils/analytics";

const DISMISS_ACTION_PREFIX = "dismiss";
const DISMISS_OVERRIDE_PERMISSIONS = [
	PermissionFlagsBits.ManageMessages,
	PermissionFlagsBits.Administrator,
	PermissionFlagsBits.ManageChannels,
	PermissionFlagsBits.ManageGuild,
];

class DismissError extends Error {
	constructor(
		public reason: string,
		message: string,
	) {
		super(message);
		this.name = "DismissError";
	}
}

function parseDismissButtonId(customId: string): string {
	const parts = customId.split(":");
	if (parts.length !== 2 || parts[0] !== DISMISS_ACTION_PREFIX) {
		throw new DismissError("invalid-format", "Invalid dismiss button format");
	}
	const dismisserId = parts[1];
	if (!dismisserId) {
		throw new DismissError(
			"invalid-format",
			"Missing dismisser ID in button customId",
		);
	}
	return dismisserId;
}

function handleDismissMessage({
	messageToDismiss,
	dismisser,
	allowedToDismissId,
}: {
	messageToDismiss: Message;
	dismisser: GuildMember;
	allowedToDismissId: string;
}): Effect.Effect<void, DismissError> {
	return Effect.gen(function* () {
		if (dismisser.id !== allowedToDismissId) {
			const hasOverridePermissions = dismisser.permissions.has(
				DISMISS_OVERRIDE_PERMISSIONS,
			);
			if (!hasOverridePermissions) {
				return yield* Effect.fail(
					new DismissError(
						"not-allowed",
						`You don't have permission to dismiss this message. Required permissions: ${DISMISS_OVERRIDE_PERMISSIONS.map((p) => Object.keys(PermissionFlagsBits).find((k) => PermissionFlagsBits[k as keyof typeof PermissionFlagsBits] === p)).join(", ")}`,
					),
				);
			}
		}

		yield* Effect.tryPromise({
			try: () => messageToDismiss.delete(),
			catch: (error) =>
				new DismissError("delete-failed", `Failed to delete message: ${error}`),
		});
	});
}

export function handleDismissButtonInteraction(interaction: ButtonInteraction) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		if (!interaction.guild || !interaction.member) {
			return yield* Effect.fail(
				new Error("Dismiss button can only be used in guilds"),
			);
		}

		const allowedToDismissId = parseDismissButtonId(interaction.customId);

		if (!interaction.guild) {
			return yield* Effect.fail(new Error("Guild not found"));
		}
		const guild = interaction.guild;
		const dismisser = yield* Effect.tryPromise({
			try: () => guild.members.fetch(interaction.user.id),
			catch: (error) => new UnknownDiscordError({ cause: error }),
		});

		if (!dismisser) {
			return yield* Effect.fail(new Error("Could not fetch member"));
		}

		const messageToDismiss = interaction.message;
		if (!(messageToDismiss instanceof Message)) {
			return yield* Effect.fail(new Error("Message not found"));
		}

		yield* trackDismissButtonClicked(dismisser, messageToDismiss).pipe(
			Effect.catchAll(() => Effect.void),
		);

		yield* handleDismissMessage({
			messageToDismiss: messageToDismiss,
			dismisser: dismisser,
			allowedToDismissId,
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					const discord = yield* Discord;
					if (interaction.deferred || interaction.replied) {
						yield* discord.callClient(() =>
							interaction.followUp({
								content: error.message,
								flags: MessageFlags.Ephemeral,
							}),
						);
					} else {
						yield* discord.callClient(() =>
							interaction.reply({
								content: error.message,
								flags: MessageFlags.Ephemeral,
							}),
						);
					}
					return yield* Effect.fail(error);
				}),
			),
		);

		if (interaction.deferred || interaction.replied) {
			yield* discord.callClient(() =>
				interaction.followUp({
					content: "Dismissed message!",
					flags: MessageFlags.Ephemeral,
				}),
			);
		} else {
			yield* discord.callClient(() =>
				interaction.reply({
					content: "Dismissed message!",
					flags: MessageFlags.Ephemeral,
				}),
			);
		}
	});
}

export const DismissButtonHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isButton() &&
					interaction.customId.startsWith("dismiss:")
				) {
					yield* handleDismissButtonInteraction(interaction).pipe(
						Effect.catchAll((error) =>
							Console.error("Error in dismiss button handler:", error),
						),
					);
				}
			}),
		);
	}),
);
