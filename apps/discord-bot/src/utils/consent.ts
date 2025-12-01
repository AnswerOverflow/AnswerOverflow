import { Database } from "@packages/database/database";
import { Effect } from "effect";

export function grantPublicDisplayConsent(userId: bigint, serverId: bigint) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const userServerSettingsLiveData =
			yield* database.private.user_server_settings.findUserServerSettingsById({
				userId,
				serverId,
			});
		const userServerSettings = userServerSettingsLiveData;

		if (userServerSettings?.canPubliclyDisplayMessages === true) {
			return false;
		}

		if (userServerSettings?.messageIndexingDisabled === true) {
			return false;
		}

		const settings = userServerSettings
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
					userId,
					serverId,
					permissions: 0,
					canPubliclyDisplayMessages: true,
					messageIndexingDisabled: false,
					apiCallsUsed: 0,
				};

		yield* database.private.user_server_settings.upsertUserServerSettings({
			settings,
		});

		return true;
	});
}

export function isAccountIgnored(userId: bigint) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const ignoredAccount =
			yield* database.private.ignored_discord_accounts.findIgnoredDiscordAccountById(
				{
					id: userId,
				},
			);

		return ignoredAccount !== null;
	});
}
