import { Database } from "@packages/database/database";
import type { GuildChannel } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { registerCommands } from "../commands/register";
import { Discord } from "../discord-client-real";
import { startIndexingLoop } from "../services/indexing";
import { isAllowedRootChannelType, toAOChannel } from "../utils/conversions";

/**
 * Layer that sets up server and channel parity on client ready
 */
export const ServerParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

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
				// Upsert each server entry and maintain channel parity
				yield* Effect.forEach(guilds, (guild) =>
					Effect.gen(function* () {
						yield* Console.log(`Upserting server ${guild.id} ${guild.name}`);
						// Upsert server
						yield* database.servers.upsertServer({
							discordId: guild.id,
							name: guild.name,
							icon: guild.icon ? guild.icon.toString() : undefined,
							description: guild.description ?? undefined,
							vanityInviteCode: guild.vanityURLCode ?? undefined,
							plan: "FREE",
							approximateMemberCount:
								guild.approximateMemberCount ?? guild.memberCount ?? 0,
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
					}),
				);
			}),
		);
	}),
);
