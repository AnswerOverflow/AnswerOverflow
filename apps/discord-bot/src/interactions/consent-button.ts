import { Database } from "@packages/database/database";
import type { ButtonInteraction, GuildMember } from "discord.js";
import { MessageFlags } from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed } from "../metrics";
import { CONSENT_ACTION_PREFIX } from "../services/mark-solution";
import { ConsentSource, trackUserGrantConsent } from "../utils/analytics";
import { grantPublicDisplayConsent, isAccountIgnored } from "../utils/consent";
import {
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

const CONSENT_SOURCES = [
	ConsentSource.ForumPostGuidelines,
	ConsentSource.ReadTheRules,
	ConsentSource.ManageAccountMenu,
	ConsentSource.MarkSolutionResponse,
	ConsentSource.ManuallyPostedPrompt,
] as const;

function parseConsentButtonInteraction(customId: string): ConsentSource | null {
	const splitInteractionId = customId.split(":");
	const action = splitInteractionId[0];
	const source = splitInteractionId[1];

	if (action !== CONSENT_ACTION_PREFIX) {
		if (action === "consent_button") {
			return ConsentSource.ManuallyPostedPrompt;
		}
		if (action === "consent_button_mark_solution") {
			return ConsentSource.MarkSolutionResponse;
		}
		if (action === "manage_account_consent_button") {
			return ConsentSource.ManageAccountMenu;
		}
		return null;
	}

	if (!source) {
		return null;
	}

	if (!CONSENT_SOURCES.includes(source as ConsentSource)) {
		return null;
	}

	return source as ConsentSource;
}

export const handleConsentButtonInteraction = Effect.fn(
	"interaction.consent_button",
)(function* (interaction: ButtonInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
		"interaction.custom_id": interaction.customId,
	});
	yield* Metric.increment(eventsProcessed);

	const database = yield* Database;
	const discord = yield* Discord;

	const consentSource = parseConsentButtonInteraction(interaction.customId);
	if (!consentSource) {
		return;
	}

	if (!interaction.guild || !interaction.member) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This button can only be used in a server.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	const member = yield* discord.callClient(() =>
		interaction.guild!.members.fetch(interaction.user.id),
	);

	if (!member) {
		yield* discord.callClient(() =>
			interaction.followUp({
				content: "Could not fetch member information.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const serverLiveData = yield* database.private.servers.getServerByDiscordId({
		discordId: BigInt(interaction.guild.id),
	});
	const server = serverLiveData;

	if (!server) {
		yield* discord.callClient(() =>
			interaction.followUp({
				content: "Server not found in database.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const ignored = yield* isAccountIgnored(BigInt(interaction.user.id));
	if (ignored) {
		yield* discord.callClient(() =>
			interaction.followUp({
				content:
					"Your account is currently being ignored. Use `/manage-account` to change this setting.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const granted = yield* grantPublicDisplayConsent(
		BigInt(interaction.user.id),
		server.discordId,
	);

	if (granted) {
		yield* catchAllSilentWithReport(
			trackUserGrantConsent(member as GuildMember, consentSource),
		);
		yield* discord.callClient(() =>
			interaction.followUp({
				content:
					"You have provided consent to display your messages publicly. Thank you for helping others find answers!",
				flags: MessageFlags.Ephemeral,
			}),
		);
		yield* Console.log(
			`Granted consent for user ${interaction.user.id} in server ${server.discordId} via ${consentSource}`,
		);
	} else {
		yield* discord.callClient(() =>
			interaction.followUp({
				content:
					"Your consent settings have already been configured. Use `/manage-account` to view or change your settings.",
				flags: MessageFlags.Ephemeral,
			}),
		);
	}
});

export const ConsentButtonHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (!interaction.isButton()) {
					return;
				}

				const customId = interaction.customId;
				if (
					!customId.startsWith(`${CONSENT_ACTION_PREFIX}:`) &&
					customId !== "consent_button" &&
					customId !== "consent_button_mark_solution" &&
					customId !== "manage_account_consent_button"
				) {
					return;
				}

				yield* handleConsentButtonInteraction(interaction).pipe(
					catchAllWithReport((error) =>
						Console.error("Error in consent button handler:", error),
					),
				);
			}),
		);
	}),
);
