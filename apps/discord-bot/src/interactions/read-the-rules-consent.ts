import { Database } from "@packages/database/database";
import type { GuildMember, PartialGuildMember } from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed } from "../metrics";
import { ConsentSource, trackUserGrantConsent } from "../utils/analytics";
import { grantPublicDisplayConsent, isAccountIgnored } from "../utils/consent";
import {
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

export const handleReadTheRulesConsent = Effect.fn(
	"event.read_the_rules_consent",
)(function* (
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": newMember.guild.id,
		"discord.user_id": newMember.id,
	});
	yield* Metric.increment(eventsProcessed);

	const database = yield* Database;

	const hasJustReadTheRules = oldMember.pending && !newMember.pending;
	if (!hasJustReadTheRules) {
		return;
	}

	if (!newMember.guild.id) {
		return;
	}

	const serverLiveData = yield* database.private.servers.getServerByDiscordId({
		discordId: BigInt(newMember.guild.id),
	});
	const server = serverLiveData;

	if (!server) {
		return;
	}

	const serverPreferencesLiveData =
		yield* database.private.server_preferences.getServerPreferencesByServerId({
			serverId: server.discordId,
		});
	const serverPreferences = serverPreferencesLiveData;

	if (!serverPreferences?.readTheRulesConsentEnabled) {
		return;
	}

	const ignored = yield* isAccountIgnored(BigInt(newMember.user.id));
	if (ignored) {
		return;
	}

	const granted = yield* grantPublicDisplayConsent(
		BigInt(newMember.user.id),
		server.discordId,
	);

	if (granted) {
		yield* catchAllSilentWithReport(
			trackUserGrantConsent(newMember, ConsentSource.ReadTheRules),
		);
		yield* Console.log(
			`Granted read the rules consent for user ${newMember.user.id} in server ${server.discordId}`,
		);
	}
});

export const ReadTheRulesConsentHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("guildMemberUpdate", (oldMember, newMember) =>
			handleReadTheRulesConsent(oldMember, newMember).pipe(
				catchAllWithReport((error) =>
					Console.error(
						`Error processing read the rules consent for member ${newMember.user.id}:`,
						error,
					),
				),
			),
		);
	}),
);
