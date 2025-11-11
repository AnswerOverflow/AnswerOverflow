import { Database } from "@packages/database/database";
import type { GuildChannel } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../discord-client-real";
import { isAllowedRootChannelType, toAOChannel } from "../utils/conversions";

/**
 * Layer that sets up channel create/update/delete event handlers for parity
 */
export const ChannelParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		// Subscribe to channelCreate event
		yield* discord.client.on("channelCreate", (channel) =>
			Effect.gen(function* () {
				// Skip DMs and non-guild channels
				if (!("guild" in channel) || !channel.guild) {
					return;
				}

				// Only maintain parity for root channels (text, announcement, forum)
				if (!("type" in channel) || !isAllowedRootChannelType(channel.type)) {
					return;
				}

				// Get server Convex ID
				const serverLiveData = yield* database.servers.getServerByDiscordId(
					channel.guild.id,
				);
				yield* Effect.sleep("10 millis");
				const server = serverLiveData?.data;

				if (!server) {
					yield* Console.warn(
						`Server ${channel.guild.id} not found, skipping channel parity`,
					);
					return;
				}

				// Upsert channel
				const aoChannel = toAOChannel(channel as GuildChannel, server._id);
				yield* database.channels.upsertManyChannels({
					channels: [
						{
							create: aoChannel,
							update: aoChannel, // Update with full channel data
						},
					],
				});
				yield* Console.log(
					`Maintained parity for new channel ${channel.name} (${channel.id})`,
				);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(
						`Error maintaining channel parity ${channel.id}:`,
						error,
					),
				),
			),
		);

		// Subscribe to channelUpdate event
		yield* discord.client.on("channelUpdate", (_oldChannel, newChannel) =>
			Effect.gen(function* () {
				// Skip DMs and non-guild channels
				if (!("guild" in newChannel) || !newChannel.guild) {
					return;
				}

				// Only maintain parity for root channels
				if (
					!("type" in newChannel) ||
					!isAllowedRootChannelType(newChannel.type)
				) {
					return;
				}

				// Check if channel exists in database
				const channelLiveData = yield* database.channels.getChannelByDiscordId(
					newChannel.id,
				);
				yield* Effect.sleep("10 millis");
				const existingChannel = channelLiveData?.data;

				if (!existingChannel) {
					// Channel doesn't exist, might be a new channel, skip
					return;
				}

				// Get server Convex ID
				const serverLiveData = yield* database.servers.getServerByDiscordId(
					newChannel.guild.id,
				);
				yield* Effect.sleep("10 millis");
				const server = serverLiveData?.data;

				if (!server) {
					yield* Console.warn(
						`Server ${newChannel.guild.id} not found, skipping channel update`,
					);
					return;
				}

				// Update channel
				yield* database.channels.updateChannel({
					id: newChannel.id,
					channel: {
						...toAOChannel(newChannel as GuildChannel, server._id),
					},
				});
				yield* Console.log(
					`Updated channel ${newChannel.name} (${newChannel.id})`,
				);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating channel ${newChannel.id}:`, error),
				),
			),
		);

		// Subscribe to channelDelete event
		yield* discord.client.on("channelDelete", (channel) =>
			Effect.gen(function* () {
				// Skip DMs and non-guild channels
				if (!("guild" in channel) || !channel.guild) {
					return;
				}

				// Delete channel from database
				yield* database.channels.deleteChannel(channel.id);
				yield* Console.log(`Deleted channel ${channel.id}`);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error deleting channel ${channel.id}:`, error),
				),
			),
		);
	}),
);
