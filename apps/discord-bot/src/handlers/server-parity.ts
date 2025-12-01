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
import { isAllowedRootChannelType, toAOChannel } from "../utils/conversions";
import { leaveServerIfNecessary } from "../utils/denylist";
import { syncChannel } from "./channel-parity";
import { startIndexingLoop } from "./indexing";

function toAOServer(guild: Guild) {
	return {
		discordId: BigInt(guild.id),
		name: guild.name,
		icon: guild.icon ? guild.icon.toString() : undefined,
		description: guild.description ?? undefined,
		vanityInviteCode: guild.vanityURLCode ?? undefined,
		plan: "FREE" as const,
		approximateMemberCount:
			guild.approximateMemberCount ?? guild.memberCount ?? 0,
	};
}

export function syncGuild(guild: Guild) {
	return Effect.gen(function* () {
		const database = yield* Database;

		yield* Console.log(`Syncing server ${guild.id} ${guild.name}`);

		const aoServerData = toAOServer(guild);
		yield* database.private.servers.upsertServer(aoServerData);

		const serverData = yield* database.private.servers.getServerByDiscordId({
			discordId: BigInt(guild.id),
		});

		if (serverData) {
			yield* database.private.servers.clearKickedTime({
				id: serverData._id,
			});
		}

		const wasNewServer = !serverData;

		if (serverData?.discordId) {
			yield* database.private.server_preferences.upsertServerPreferences({
				serverId: serverData.discordId,
				considerAllMessagesPublicEnabled: true,
			});
		}

		const server = serverData;

		if (!server) {
			yield* Console.warn(
				`Server ${guild.id} not found after upsert, skipping channel parity`,
			);
			return;
		}

		if (wasNewServer) {
			yield* registerServerGroup(guild, server.discordId.toString()).pipe(
				Effect.catchAll(() => Effect.void),
			);
		}

		if (server.preferencesId) {
			const preferencesLiveData =
				yield* database.private.server_preferences.getServerPreferencesByServerId(
					{
						serverId: server.discordId,
					},
				);
			const preferences = preferencesLiveData;
			if (preferences?.customDomain && server.icon) {
				const storage = yield* Storage;
				yield* storage
					.uploadFileFromUrl({
						id: server.icon,
						filename: "icon.png",
						contentType: "image/png",
						url: `https://cdn.discordapp.com/icons/${guild.id}/${server.icon}.png?size=48`,
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
		}

		const channels = Arr.fromIterable(guild.channels.cache.values());
		const rootChannels = channels.filter((channel) => {
			return isAllowedRootChannelType(channel.type);
		});

		if (rootChannels.length > 0) {
			const channelsToUpsert = rootChannels.map((channel) => {
				const aoChannel = toAOChannel(channel);
				return {
					create: aoChannel,
					update: aoChannel,
				};
			});

			yield* Effect.forEach(
				channelsToUpsert,
				(channel) =>
					Effect.gen(function* () {
						yield* database.private.channels.upsertChannel({
							channel: channel.create,
						});
					}),
				{ concurrency: 10 },
			);

			yield* Console.log(
				`Maintained parity for ${rootChannels.length} channels for server ${guild.name}`,
			);

			for (const channel of rootChannels) {
				yield* syncChannel(channel);
			}
		}
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
				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: BigInt(newGuild.id),
					});
				const existingServer = serverLiveData;

				if (!existingServer) {
					return;
				}

				const aoServerData = toAOServer(newGuild);
				const {
					_id,
					_creationTime,
					discordId: _discordId,
					name: _name,
					icon: _icon,
					description: _description,
					vanityInviteCode: _vanityInviteCode,
					approximateMemberCount: _approximateMemberCount,
					kickedTime: _kickedTime,
					...preservedFields
				} = existingServer;

				yield* database.private.servers.updateServer({
					id: existingServer._id,
					data: {
						...preservedFields,
						discordId: BigInt(newGuild.id),
						name: aoServerData.name,
						icon: aoServerData.icon,
						description: aoServerData.description,
						vanityInviteCode: aoServerData.vanityInviteCode,
						approximateMemberCount: aoServerData.approximateMemberCount,
					},
				});

				if (
					existingServer.kickedTime !== undefined &&
					existingServer.kickedTime !== null
				) {
					yield* database.private.servers.clearKickedTime({
						id: existingServer._id,
					});
				}
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating guild ${newGuild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("guildDelete", (guild) =>
			Effect.gen(function* () {
				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: BigInt(guild.id),
					});
				const existingServer = serverLiveData;

				if (!existingServer) {
					return;
				}

				const { _id, _creationTime, ...serverData } = existingServer;

				yield* database.private.servers.updateServer({
					id: existingServer._id,
					data: {
						...serverData,
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

				yield* Console.log("Starting indexing loop...");
				yield* startIndexingLoop(true).pipe(
					Effect.tap(() => Console.log("Indexing loop started")),
					Effect.catchAllCause((cause) =>
						Console.error("Error starting indexing loop:", cause),
					),
				);

				const guilds = yield* discord.getGuilds();
				const activeServerIds = new Set(guilds.map((guild) => guild.id));

				yield* Effect.forEach(guilds, (guild) =>
					Effect.gen(function* () {
						const leftServer = yield* leaveServerIfNecessary(guild);
						if (leftServer) {
							return;
						}
						console.log("syncing guild", guild.name);
						yield* syncGuild(guild);
					}).pipe(
						Effect.catchAll((error) =>
							Console.error(`Error syncing guild ${guild.id}:`, error),
						),
					),
				);

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
							const { _id, _creationTime, ...serverData } = server;
							yield* database.private.servers.updateServer({
								id: server._id,
								data: {
									...serverData,
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
