import { Database } from "@packages/database/database";
import type { AnyThreadChannel, GuildChannel } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../discord-client-real";
import {
	isAllowedRootChannel,
	isAllowedThreadChannel,
	toAOChannel,
} from "../utils/conversions";

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
				if (!isAllowedRootChannel(channel)) {
					return;
				}
				const serverLiveData = yield* database.servers.getServerByDiscordId(
					channel.guild.id,
				);
				const server = serverLiveData?.data;
				if (!server) {
					// this should never happen
					yield* Console.warn(
						`Server ${channel.guild.id} not found, skipping channel parity`,
					);
					return;
				}
				const aoChannel = toAOChannel(channel, server._id);
				yield* database.channels.upsertManyChannels({
					channels: [
						{
							create: aoChannel,
							update: aoChannel,
						},
					],
				});
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
				if (!isAllowedRootChannel(newChannel)) {
					return;
				}
				// Check if channel exists in database
				const channelLiveData = yield* database.channels.getChannelByDiscordId(
					newChannel.id,
				);
				const existingChannel = channelLiveData?.data;

				if (!existingChannel) {
					// this should never happen
					yield* Console.warn(
						`Channel ${newChannel.id} not found, skipping channel update`,
					);
					return;
				}

				const serverLiveData = yield* database.servers.getServerByDiscordId(
					newChannel.guild.id,
				);
				const server = serverLiveData?.data;
				if (!server) {
					// this should never happen
					yield* Console.warn(
						`Server ${newChannel.guild.id} not found, skipping channel update`,
					);
					return;
				}

				yield* database.channels.updateChannel({
					id: newChannel.id,
					channel: {
						...toAOChannel(newChannel as GuildChannel, server._id),
					},
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating channel ${newChannel.id}:`, error),
				),
			),
		);

		// Subscribe to channelDelete event
		yield* discord.client.on("channelDelete", (channel) =>
			Effect.gen(function* () {
				if (!isAllowedRootChannel(channel)) {
					return;
				}
				yield* database.channels.deleteChannel(channel.id);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error deleting channel ${channel.id}:`, error),
				),
			),
		);

		yield* discord.client.on("threadUpdate", (_oldThread, newThread) =>
			Effect.gen(function* () {
				if (!isAllowedThreadChannel(newThread)) {
					return;
				}
				const channelLiveData = yield* database.channels.getChannelByDiscordId(
					newThread.id,
				);
				const existingChannel = channelLiveData?.data;

				if (!existingChannel) {
					// this should never happen
					yield* Console.warn(
						`Thread ${newThread.id} not found, skipping thread update`,
					);
					return;
				}

				const serverLiveData = yield* database.servers.getServerByDiscordId(
					newThread.guild.id,
				);

				const server = serverLiveData?.data;

				if (!server) {
					yield* Console.warn(
						`Server ${newThread.guild.id} not found, skipping thread update`,
					);
					return;
				}

				yield* database.channels.updateChannel({
					id: newThread.id,
					channel: {
						...toAOChannel(newThread as AnyThreadChannel, server._id),
					},
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating thread ${newThread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("threadDelete", (thread) =>
			Effect.gen(function* () {
				if (!isAllowedThreadChannel(thread)) {
					return;
				}
				const channelLiveData = yield* database.channels.getChannelByDiscordId(
					thread.id,
				);
				const existingChannel = channelLiveData?.data;

				if (!existingChannel) {
					// this should never happen
					yield* Console.warn(
						`Thread ${thread.id} not found, skipping thread delete`,
					);
					return;
				}

				// Delete thread from database
				yield* database.channels.deleteChannel(thread.id);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error deleting thread ${thread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("inviteDelete", (invite) =>
			Effect.gen(function* () {
				const channelLiveData =
					yield* database.channels.findChannelByInviteCode(invite.code);
				const channelWithSettings = channelLiveData?.data;

				if (!channelWithSettings) {
					return;
				}

				const {
					flags: _flags,
					_id,
					_creationTime,
					inviteCode: _inviteCode,
					...channel
				} = channelWithSettings;

				yield* database.channels.updateChannel({
					id: channel.id,
					channel: {
						...channel,
					},
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(
						`Error removing invite code from channel (invite: ${invite.code}):`,
						error,
					),
				),
			),
		);
	}),
);
