import { Database } from "@packages/database/database";
import type { AnyThreadChannel, GuildChannel } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import {
	isAllowedRootChannel,
	isAllowedThreadChannel,
	toAOChannel,
} from "../utils/conversions";

export const ChannelParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* discord.client.on("channelCreate", (channel) =>
			Effect.gen(function* () {
				if (!isAllowedRootChannel(channel)) {
					return;
				}
				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: channel.guild.id,
					});
				const server = serverLiveData;
				if (!server) {
					yield* Console.warn(
						`Server ${channel.guild.id} not found, skipping channel parity`,
					);
					return;
				}
				const aoChannel = toAOChannel(channel, server.discordId);
				yield* database.private.channels.upsertManyChannels({
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

		yield* discord.client.on("threadCreate", (thread) =>
			Effect.gen(function* () {
				if (!isAllowedThreadChannel(thread)) {
					return;
				}
				if (!thread.parentId) {
					return;
				}
				const parentChannelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: thread.parentId,
					});
				const parentChannel = parentChannelLiveData;
				if (!parentChannel) {
					return;
				}
				if (!parentChannel.flags?.indexingEnabled) {
					return;
				}
				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: thread.guild.id,
					});
				const server = serverLiveData;
				if (!server) {
					yield* Console.warn(
						`Server ${thread.guild.id} not found, skipping thread parity`,
					);
					return;
				}
				const aoThread = toAOChannel(thread, server.discordId);
				yield* database.private.channels.upsertManyChannels({
					channels: [
						{
							create: aoThread,
							update: aoThread,
						},
					],
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error maintaining thread parity ${thread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("channelUpdate", (_oldChannel, newChannel) =>
			Effect.gen(function* () {
				if (!isAllowedRootChannel(newChannel)) {
					return;
				}
				const channelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: newChannel.id,
					});
				const existingChannel = channelLiveData;

				if (!existingChannel) {
					yield* Console.warn(
						`Channel ${newChannel.id} not found, skipping channel update`,
					);
					return;
				}

				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: newChannel.guild.id,
					});
				const server = serverLiveData;
				if (!server) {
					yield* Console.warn(
						`Server ${newChannel.guild.id} not found, skipping channel update`,
					);
					return;
				}

				const discordChannelData = toAOChannel(
					newChannel as GuildChannel,
					server.discordId,
				);

				yield* database.private.channels.updateChannel({
					id: newChannel.id,
					channel: {
						...discordChannelData,
						inviteCode: existingChannel.inviteCode,
						solutionTagId: existingChannel.solutionTagId,
						lastIndexedSnowflake: existingChannel.lastIndexedSnowflake,
					},
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error updating channel ${newChannel.id}:`, error),
				),
			),
		);

		yield* discord.client.on("channelDelete", (channel) =>
			Effect.gen(function* () {
				if (!isAllowedRootChannel(channel)) {
					return;
				}
				yield* database.private.channels.deleteChannel({ id: channel.id });
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
				const channelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: newThread.id,
					});
				const existingChannel = channelLiveData;

				if (!existingChannel) {
					yield* Console.warn(
						`Thread ${newThread.id} not found, skipping thread update`,
					);
					return;
				}

				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: newThread.guild.id,
					});

				const server = serverLiveData;

				if (!server) {
					yield* Console.warn(
						`Server ${newThread.guild.id} not found, skipping thread update`,
					);
					return;
				}

				const discordThreadData = toAOChannel(
					newThread as AnyThreadChannel,
					server.discordId,
				);

				yield* database.private.channels.updateChannel({
					id: newThread.id,
					channel: {
						...discordThreadData,
						inviteCode: existingChannel.inviteCode,
						solutionTagId: existingChannel.solutionTagId,
						lastIndexedSnowflake: existingChannel.lastIndexedSnowflake,
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
				const channelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: thread.id,
					});
				const existingChannel = channelLiveData;

				if (!existingChannel) {
					yield* Console.warn(
						`Thread ${thread.id} not found, skipping thread delete`,
					);
					return;
				}

				yield* database.private.channels.deleteChannel({ id: thread.id });
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error deleting thread ${thread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("inviteDelete", (invite) =>
			Effect.gen(function* () {
				const channelLiveData =
					yield* database.private.channels.findChannelByInviteCode({
						inviteCode: invite.code,
					});
				const channelWithSettings = channelLiveData;

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

				yield* database.private.channels.updateChannel({
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
