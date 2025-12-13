import { Database } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { trackUserJoinedServer, trackUserLeftServer } from "../utils/analytics";
import { toAODiscordAccount } from "../utils/conversions";

export const UserParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* discord.client.on("userUpdate", (_oldUser, newUser) =>
			Effect.gen(function* () {
				yield* database.private.discord_accounts.upsertDiscordAccount({
					account: toAODiscordAccount(newUser),
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating Discord account ${newUser.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildMemberAdd", (member) =>
			Effect.gen(function* () {
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

				yield* trackUserJoinedServer(
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
				).pipe(Effect.catchAll(() => Effect.void));
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error handling guild member add ${member.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildMemberRemove", (member) =>
			Effect.gen(function* () {
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

				yield* trackUserLeftServer(
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
				).pipe(Effect.catchAll(() => Effect.void));
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(
						`Error handling guild member remove ${member.id}:`,
						error,
					),
				),
			),
		);
	}),
);
