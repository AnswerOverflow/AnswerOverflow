import { Database } from "@packages/database/database";
import { Storage } from "@packages/database/storage";
import type { Guild } from "discord.js";
import { Array as Arr, Console, Effect, Layer } from "effect";
import { registerCommands } from "../commands/register";
import { Discord } from "../core/discord-service";
import {
	registerServerGroup,
	trackServerJoin,
	trackServerLeave,
} from "../utils/analytics";
import { isAllowedRootChannelType } from "../utils/conversions";
import { leaveServerIfNecessary } from "../utils/denylist";
import { syncChannel } from "./channel";

function toAOServer(guild: Guild) {
	return {
		discordId: BigInt(guild.id),
		name: guild.name,
		icon: guild.icon ? guild.icon.toString() : undefined,
		description: guild.description ?? undefined,
		vanityInviteCode: guild.vanityURLCode ?? undefined,
		approximateMemberCount:
			guild.approximateMemberCount ?? guild.memberCount ?? 0,
	};
}

export function syncGuild(guild: Guild) {
	return Effect.gen(function* () {
		const database = yield* Database;

		yield* Console.log(`Syncing server ${guild.id} ${guild.name}`);

		const aoServerData = toAOServer(guild);
		const { isNew } =
			yield* database.private.servers.upsertServer(aoServerData);

		if (isNew) {
			yield* registerServerGroup(guild, guild.id).pipe(
				Effect.catchAll(() => Effect.void),
			);

			yield* database.private.server_preferences.updateServerPreferences({
				serverId: BigInt(guild.id),
				preferences: {},
			});
		}

		const preferencesLiveData =
			yield* database.private.server_preferences.getServerPreferencesByServerId(
				{
					serverId: BigInt(guild.id),
				},
			);
		const preferences = preferencesLiveData;
		if (preferences?.customDomain && guild.icon) {
			const storage = yield* Storage;
			yield* storage
				.uploadFileFromUrl({
					id: `${guild.id}/${guild.icon}`,
					filename: "icon.png",
					contentType: "image/png",
					url: `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=48`,
				})
				.pipe(
					Effect.tap(() =>
						Console.log(
							`Uploaded server icon for ${guild.name} (custom domain: ${preferences.customDomain})`,
						),
					),
					Effect.catchAll((error) =>
						Console.warn(
							`Failed to upload server icon for ${guild.name}:`,
							error,
						),
					),
				);
		}

		const channels = Arr.fromIterable(guild.channels.cache.values());
		const rootChannels = channels.filter((channel) => {
			return isAllowedRootChannelType(channel.type);
		});

		yield* Effect.forEach(rootChannels, (channel) => syncChannel(channel));
	}).pipe(
		Effect.catchAll((error) =>
			Console.error(`Error syncing guild ${guild.id}:`, error),
		),
	);
}

export const ServerParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* discord.client.on("guildCreate", (guild) =>
			Effect.gen(function* () {
				yield* Console.log(
					`Bot joined new server: ${guild.name} (${guild.id})`,
				);

				const leftServer = yield* leaveServerIfNecessary(guild);
				if (leftServer) {
					return;
				}

				yield* syncGuild(guild);
				yield* trackServerJoin(guild).pipe(Effect.catchAll(() => Effect.void));
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error handling guild create ${guild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildUpdate", (_oldGuild, newGuild) =>
			Effect.gen(function* () {
				yield* syncGuild(newGuild);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating guild ${newGuild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildDelete", (guild) =>
			Effect.gen(function* () {
				const db = yield* Database;
				db.private.servers.updateServer({
					serverId: BigInt(guild.id),
					server: {
						kickedTime: Date.now(),
					},
				});
				yield* trackServerLeave(guild).pipe(Effect.catchAll(() => Effect.void));
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error handling guild delete ${guild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("clientReady", (client) =>
			Effect.gen(function* () {
				yield* registerCommands().pipe(
					Effect.catchAll((error) =>
						Console.error("Error registering commands:", error),
					),
				);

				const servers = yield* database.private.servers.getAllServers();
				const serverCount = servers?.length ?? 0;
				yield* Console.log(
					`Logged in as ${client.user.tag}! ${serverCount} servers`,
				);
				const guilds = yield* discord.getGuilds();
				const activeServerIds = new Set(guilds.map((guild) => guild.id));

				yield* Console.table([
					{
						"Total Servers": serverCount,
						"Active Servers": activeServerIds.size,
					},
				]);

				const allServers = servers ?? [];

				const serversToMarkAsKicked = allServers.filter(
					(server) =>
						!activeServerIds.has(server.discordId.toString()) &&
						!server.kickedTime,
				);

				if (serversToMarkAsKicked.length > 0) {
					yield* Console.log(
						`Marking ${serversToMarkAsKicked.length} servers as kicked`,
					);
					yield* Effect.forEach(serversToMarkAsKicked, (server) =>
						Effect.gen(function* () {
							yield* database.private.servers.updateServer({
								serverId: server.discordId,
								server: {
									kickedTime: Date.now(),
								},
							});
							yield* Console.log(`Marked server ${server.name} as kicked`);
						}).pipe(
							Effect.catchAll((error) =>
								Console.error(
									`Error marking server ${server.discordId} as kicked:`,
									error,
								),
							),
						),
					);
				}
			}),
		);
	}),
);
