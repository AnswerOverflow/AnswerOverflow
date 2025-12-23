import type { ButtonInteraction, GuildMember } from "discord.js";
import { Message, MessageFlags, PermissionFlagsBits } from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { Discord, UnknownDiscordError } from "../core/discord-service";
import { eventsProcessed } from "../metrics";
import { trackDismissButtonClicked } from "../utils/analytics";
import {
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

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

export const handleDismissButtonInteraction = Effect.fn(
	"interaction.dismiss_button",
)(function* (interaction: ButtonInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
		"interaction.custom_id": interaction.customId,
	});
	yield* Metric.increment(eventsProcessed);

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

	yield* catchAllSilentWithReport(
		trackDismissButtonClicked(dismisser, messageToDismiss),
	);

	yield* handleDismissMessage({
		messageToDismiss: messageToDismiss,
		dismisser: dismisser,
		allowedToDismissId,
	}).pipe(
		catchAllWithReport((error) =>
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
						catchAllWithReport((error) =>
							Console.error("Error in dismiss button handler:", error),
						),
					);
				}
			}),
		);
	}),
);
