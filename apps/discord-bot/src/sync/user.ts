import { Database } from "@packages/database/database";
import { Console, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed, syncOperations } from "../metrics";
import { trackUserJoinedServer, trackUserLeftServer } from "../utils/analytics";
import { toAODiscordAccount } from "../utils/conversions";
import {
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

const invalidateUserGuildsCacheForMember = (
	database: Effect.Effect.Success<typeof Database>,
	discordUserId: string,
) =>
	Effect.gen(function* () {
		const oauthAccount =
			yield* database.private.cache.findDiscordOAuthAccountByDiscordId(
				{ discordId: discordUserId },
				{ subscribe: false },
			);

		if (!oauthAccount) {
			return;
		}

		yield* database.private.cache.invalidateUserGuildsCache({
			discordAccountId: BigInt(oauthAccount.accountId),
		});
	}).pipe(
		catchAllWithReport((error) =>
			Console.error(
				`Error invalidating guilds cache for user ${discordUserId}:`,
				error,
			),
		),
	);

export const UserParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* discord.client.on("userUpdate", (_oldUser, newUser) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.user_id": newUser.id,
					"discord.username": newUser.username,
				});
				yield* Metric.increment(eventsProcessed);
				yield* Metric.increment(syncOperations);

				yield* database.private.discord_accounts.upsertDiscordAccount({
					account: toAODiscordAccount(newUser),
				});
			}).pipe(
				Effect.withSpan("event.user_update"),
				catchAllWithReport((error) =>
					Console.error(`Error updating Discord account ${newUser.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildMemberAdd", (member) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.user_id": member.user.id,
					"discord.username": member.user.username,
					"discord.guild_id": member.guild.id,
					"discord.guild_name": member.guild.name,
				});
				yield* Metric.increment(eventsProcessed);

				yield* invalidateUserGuildsCacheForMember(database, member.user.id);

				const serverData = yield* database.private.servers.getServerByDiscordId(
					{
						discordId: BigInt(member.guild.id),
					},
				);
				if (!serverData) return;

				const preferencesData =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{
							serverId: BigInt(member.guild.id),
						},
					);

				yield* catchAllSilentWithReport(
					trackUserJoinedServer(
						member,
						{
							discordId: serverData.discordId.toString(),
							name: serverData.name,
						},
						preferencesData
							? {
									readTheRulesConsentEnabled:
										preferencesData.readTheRulesConsentEnabled,
								}
							: undefined,
					),
				);
			}).pipe(
				Effect.withSpan("event.guild_member_add"),
				catchAllWithReport((error) =>
					Console.error(`Error handling guild member add ${member.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildMemberRemove", (member) =>
			Effect.gen(function* () {
				yield* Effect.annotateCurrentSpan({
					"discord.user_id": member.user.id,
					"discord.username": member.user.username,
					"discord.guild_id": member.guild.id,
					"discord.guild_name": member.guild.name,
				});
				yield* Metric.increment(eventsProcessed);

				yield* invalidateUserGuildsCacheForMember(database, member.user.id);

				const serverData = yield* database.private.servers.getServerByDiscordId(
					{
						discordId: BigInt(member.guild.id),
					},
				);
				if (!serverData) return;

				const preferencesData =
					yield* database.private.server_preferences.getServerPreferencesByServerId(
						{
							serverId: BigInt(member.guild.id),
						},
					);

				yield* catchAllSilentWithReport(
					trackUserLeftServer(
						member,
						{
							discordId: serverData.discordId.toString(),
							name: serverData.name,
						},
						preferencesData
							? {
									readTheRulesConsentEnabled:
										preferencesData.readTheRulesConsentEnabled,
								}
							: undefined,
					),
				);
			}).pipe(
				Effect.withSpan("event.guild_member_remove"),
				catchAllWithReport((error) =>
					Console.error(
						`Error handling guild member remove ${member.id}:`,
						error,
					),
				),
			),
		);
	}),
);
