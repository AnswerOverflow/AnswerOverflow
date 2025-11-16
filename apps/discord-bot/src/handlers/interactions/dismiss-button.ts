import type { ButtonInteraction, GuildMember } from "discord.js";
import { Message, PermissionFlagsBits } from "discord.js";
import { Effect } from "effect";

// Dismiss button constants (must match send-mark-solution-instructions.ts)
const DISMISS_ACTION_PREFIX = "dismiss";
const DISMISS_OVERRIDE_PERMISSIONS = [
	PermissionFlagsBits.ManageMessages,
	PermissionFlagsBits.Administrator,
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

/**
 * Parses a dismiss button customId to extract the allowed dismisser ID
 */
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

/**
 * Handles dismissing a message via button interaction
 */
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
				yield* Effect.fail(
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

/**
 * Handles a dismiss button interaction
 */
export function handleDismissButtonInteraction(
	interaction: ButtonInteraction,
): Effect.Effect<void, unknown> {
	return Effect.gen(function* () {
		// Only handle button interactions in guilds
		if (!interaction.guild || !interaction.member) {
			yield* Effect.fail(
				new Error("Dismiss button can only be used in guilds"),
			);
		}

		// Parse the customId to get the allowed dismisser ID
		const allowedToDismissId = parseDismissButtonId(interaction.customId);

		if (!interaction.guild) {
			return yield* Effect.fail(new Error("Guild not found"));
		}
		const guild = interaction.guild;
		const dismisser = yield* Effect.tryPromise({
			try: () => guild.members.fetch(interaction.user.id),
			catch: (error) => error,
		});

		if (!dismisser) {
			yield* Effect.fail(new Error("Could not fetch member"));
		}

		const messageToDismiss = interaction.message;
		if (!(messageToDismiss instanceof Message)) {
			yield* Effect.fail(new Error("Message not found"));
		}

		yield* handleDismissMessage({
			messageToDismiss: messageToDismiss as Message,
			dismisser: dismisser as GuildMember,
			allowedToDismissId,
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					// Reply to the interaction with error message
					if (interaction.deferred || interaction.replied) {
						yield* Effect.tryPromise({
							try: () =>
								interaction.followUp({
									content: error.message,
									ephemeral: true,
								}),
							catch: () => undefined,
						});
					} else {
						yield* Effect.tryPromise({
							try: () =>
								interaction.reply({
									content: error.message,
									ephemeral: true,
								}),
							catch: () => undefined,
						});
					}
					return yield* Effect.fail(error);
				}),
			),
		);

		// Reply with success
		if (interaction.deferred || interaction.replied) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.followUp({
						content: "Dismissed message!",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
		} else {
			yield* Effect.tryPromise({
				try: () =>
					interaction.reply({
						content: "Dismissed message!",
						ephemeral: true,
					}),
				catch: () => undefined,
			});
		}
	});
}
