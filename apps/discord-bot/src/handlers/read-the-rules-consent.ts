import { Database, DatabaseLayer } from "@packages/database/database";
import type { GuildMember, PartialGuildMember } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";

export function handleReadTheRulesConsent(
	oldMember: GuildMember | PartialGuildMember,
	newMember: GuildMember,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		const hasJustReadTheRules = oldMember.pending && !newMember.pending;
		if (!hasJustReadTheRules) {
			return;
		}

		if (!newMember.guild.id) {
			return;
		}

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: newMember.guild.id,
			},
		);
		const server = serverLiveData;

		if (!server) {
			return;
		}

		const serverPreferencesLiveData = yield* Effect.scoped(
			database.private.server_preferences.getServerPreferencesByServerId({
				serverId: server.discordId,
			}),
		);
		const serverPreferences = serverPreferencesLiveData;

		if (!serverPreferences?.readTheRulesConsentEnabled) {
			return;
		}

		const ignoredAccount =
			yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
				{
					id: newMember.user.id,
				},
			);

		if (ignoredAccount !== null) {
			return;
		}

		const userServerSettingsLiveData = yield* Effect.scoped(
			database.private.user_server_settings.findUserServerSettingsById({
				userId: newMember.user.id,
				serverId: server.discordId,
			}),
		);
		const userServerSettings = userServerSettingsLiveData;

		if (userServerSettings?.canPubliclyDisplayMessages === true) {
			return;
		}

		if (userServerSettings?.messageIndexingDisabled === true) {
			return;
		}

		const existingSettings = userServerSettings
			? {
					userId: userServerSettings.userId,
					serverId: userServerSettings.serverId,
					permissions: userServerSettings.permissions,
					canPubliclyDisplayMessages: true,
					messageIndexingDisabled: userServerSettings.messageIndexingDisabled,
					apiKey: userServerSettings.apiKey,
					apiCallsUsed: userServerSettings.apiCallsUsed,
					botAddedTimestamp: userServerSettings.botAddedTimestamp,
				}
			: {
					userId: newMember.user.id,
					serverId: server.discordId,
					permissions: 0,
					canPubliclyDisplayMessages: true,
					messageIndexingDisabled: false,
					apiCallsUsed: 0,
				};

		yield* database.private.user_server_settings.upsertUserServerSettings({
			settings: existingSettings,
		});

		yield* Console.log(
			`Granted read the rules consent for user ${newMember.user.id} in server ${server.discordId}`,
		);
	}).pipe(
		Effect.catchAll((error) =>
			Console.error(
				`Error processing read the rules consent for member ${newMember.user.id}:`,
				error,
			),
		),
	);
}

export const ReadTheRulesConsentHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("guildMemberUpdate", (oldMember, newMember) =>
			Effect.scoped(
				handleReadTheRulesConsent(oldMember, newMember).pipe(
					Effect.provide(DatabaseLayer),
					Effect.ignore,
				),
			),
		);
	}),
);
