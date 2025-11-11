import { Database } from "@packages/database/database";
import type { Guild, GuildChannel } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { registerCommands } from "../commands/register";
import { Discord } from "../discord-client-real";
import { startIndexingLoop } from "../services/indexing";
import { isAllowedRootChannelType, toAOChannel } from "../utils/conversions";

/**
 * Converts a Discord Guild to AnswerOverflow Server data
 */
function toAOServer(guild: Guild) {
	return {
		discordId: guild.id,
		name: guild.name,
		icon: guild.icon ? guild.icon.toString() : undefined,
		description: guild.description ?? undefined,
		vanityInviteCode: guild.vanityURLCode ?? undefined,
		plan: "FREE" as const,
		approximateMemberCount:
			guild.approximateMemberCount ?? guild.memberCount ?? 0,
	};
}

/**
 * Syncs a single guild (server) to the database
 * This includes upserting the server and maintaining channel parity
 */
function syncGuild(guild: Guild) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* Console.log(`Syncing server ${guild.id} ${guild.name}`);

		// Upsert server - explicitly clear kickedTime if server is active
		const aoServerData = toAOServer(guild);
		yield* database.servers.upsertServer({
			...aoServerData,
			kickedTime: undefined, // Explicitly clear kickedTime when server is active
		});

		const serverLiveData = yield* database.servers.getServerByDiscordId(
			guild.id,
		);

		if (serverLiveData?.data?._id) {
			yield* database.serverPreferences.upsertServerPreferences({
				serverId: serverLiveData?.data?._id,
				considerAllMessagesPublicEnabled: true,
			});
		}

		const server = serverLiveData?.data;

		if (!server) {
			yield* Console.warn(
				`Server ${guild.id} not found after upsert, skipping channel parity`,
			);
			return;
		}

		// If server has a custom domain, upload their server icon to storage
		if (server.preferencesId) {
			const preferencesLiveData =
				yield* database.serverPreferences.getServerPreferencesByServerId(
					server._id,
				);
			const preferences = preferencesLiveData?.data;
			if (preferences?.customDomain && server.icon) {
				yield* database.attachments
					.uploadAttachmentFromUrl({
						url: `https://cdn.discordapp.com/icons/${guild.id}/${server.icon}.png?size=48`,
						filename: `${server.icon}/icon.png`,
						contentType: "image/png",
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

		// Maintain channel parity - only root channels (text, announcement, forum)
		const channels = yield* discord.getChannels(guild.id);
		const rootChannels = channels.filter((channel) => {
			if (!("guild" in channel) || !channel.guild) return false;
			if (!("type" in channel)) return false;
			if (!("name" in channel)) return false;
			return isAllowedRootChannelType(channel.type);
		}) as GuildChannel[];

		if (rootChannels.length > 0) {
			const channelsToUpsert = rootChannels.map((channel) => {
				const aoChannel = toAOChannel(channel, server._id);
				return {
					create: aoChannel,
					update: aoChannel, // Update with full channel data
				};
			});

			yield* database.channels.upsertManyChannels({
				channels: channelsToUpsert,
			});
			yield* Console.log(
				`Maintained parity for ${rootChannels.length} channels for server ${guild.name}`,
			);
		}
	}).pipe(
		Effect.catchAll((error) =>
			Console.error(`Error syncing guild ${guild.id}:`, error),
		),
	);
}

/**
 * Layer that sets up server and channel parity on client ready and guild join
 */
export const ServerParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		// Handle guildCreate event - when bot joins a new server
		yield* discord.client.on("guildCreate", (guild) =>
			Effect.gen(function* () {
				yield* Console.log(
					`Bot joined new server: ${guild.name} (${guild.id})`,
				);
				yield* syncGuild(guild);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error handling guild create ${guild.id}:`, error),
				),
			),
		);

		// Subscribe to guildUpdate event
		yield* discord.client.on("guildUpdate", (_oldGuild, newGuild) =>
			Effect.gen(function* () {
				// Check if server exists in database
				const serverLiveData = yield* database.servers.getServerByDiscordId(
					newGuild.id,
				);
				const existingServer = serverLiveData?.data;

				if (!existingServer) {
					// Server doesn't exist, might be a new server, skip
					return;
				}

				// Update server with new data, preserving fields not in guild object
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
					...preservedFields
				} = existingServer;

				yield* database.servers.updateServer(existingServer._id, {
					...preservedFields,
					// Update fields that come from the guild object
					discordId: newGuild.id,
					name: aoServerData.name,
					icon: aoServerData.icon,
					description: aoServerData.description,
					vanityInviteCode: aoServerData.vanityInviteCode,
					approximateMemberCount: aoServerData.approximateMemberCount,
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating guild ${newGuild.id}:`, error),
				),
			),
		);

		// Subscribe to guildDelete event
		yield* discord.client.on("guildDelete", (guild) =>
			Effect.gen(function* () {
				// Check if server exists in database
				const serverLiveData = yield* database.servers.getServerByDiscordId(
					guild.id,
				);
				const existingServer = serverLiveData?.data;

				if (!existingServer) {
					// Server doesn't exist, skip
					return;
				}

				// Mark server as kicked instead of deleting
				const { _id, _creationTime, ...serverData } = existingServer;

				yield* database.servers.updateServer(existingServer._id, {
					...serverData,
					kickedTime: Date.now(),
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error handling guild delete ${guild.id}:`, error),
				),
			),
		);

		yield* discord.client.on("clientReady", (client) =>
			Effect.gen(function* () {
				// Register slash commands
				yield* registerCommands().pipe(
					Effect.catchAll((error) =>
						Console.error("Error registering commands:", error),
					),
				);

				const servers = yield* database.servers.publicGetAllServers();
				// LiveData might not have data immediately, so we handle undefined
				const serverCount = servers?.data?.length ?? 0;
				yield* Console.log(
					`Logged in as ${client.user.tag}! ${serverCount} servers`,
				);

				// Start indexing loop
				yield* Console.log("Starting indexing loop...");
				yield* startIndexingLoop(true).pipe(
					Effect.tap(() => Console.log("Indexing loop started")),
					Effect.catchAllCause((cause) =>
						Console.error("Error starting indexing loop:", cause),
					),
				);

				const guilds = yield* discord.getGuilds();
				// Track which servers the bot is currently in
				const activeServerIds = new Set(guilds.map((guild) => guild.id));

				// Upsert each server entry and maintain channel parity
				yield* Effect.forEach(guilds, syncGuild);

				// For any servers that are in the database but not in the guilds the bot is in,
				// mark them as kicked (handles cases where bot was offline when kicked)
				const allServers = servers?.data ?? [];
				const serversToMarkAsKicked = allServers.filter(
					(server) =>
						!activeServerIds.has(server.discordId) && !server.kickedTime,
				);

				if (serversToMarkAsKicked.length > 0) {
					yield* Console.log(
						`Marking ${serversToMarkAsKicked.length} servers as kicked`,
					);
					yield* Effect.forEach(serversToMarkAsKicked, (server) =>
						Effect.gen(function* () {
							const { _id, _creationTime, ...serverData } = server;
							yield* database.servers.updateServer(server._id, {
								...serverData,
								kickedTime: Date.now(),
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
