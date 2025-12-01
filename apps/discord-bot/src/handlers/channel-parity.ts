import { Database } from "@packages/database/database";
import type {
	AnyThreadChannel,
	GuildBasedChannel,
	GuildChannel,
} from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import {
	isAllowedRootChannel,
	isAllowedThreadChannel,
	toAOChannel,
} from "../utils/conversions";

export function syncChannel(
	channel: GuildBasedChannel | GuildChannel | AnyThreadChannel,
) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		const discordChannelData = toAOChannel(channel);

		const botPermissions = yield* discord.getBotPermissionsForChannel(
			channel.id,
			channel.guild.id,
		);

		yield* database.private.channels.updateChannel({
			id: BigInt(channel.id),
			channel: {
				...discordChannelData,
				botPermissions: botPermissions ?? undefined,
			},
		});
	}).pipe(
		Effect.catchAll((error) =>
			Console.warn(`Failed to sync channel ${channel.id}:`, error),
		),
	);
}

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
						discordId: BigInt(channel.guild.id),
					});
				const server = serverLiveData;
				if (!server) {
					yield* Console.warn(
						`Server ${channel.guild.id} not found, skipping channel parity`,
					);
					return;
				}
				const aoChannel = toAOChannel(channel);
				const botPermissions = yield* discord.getBotPermissionsForChannel(
					channel.id,
					channel.guild.id,
				);
				yield* database.private.channels.upsertChannelWithSettings({
					channel: {
						...aoChannel,
						botPermissions: botPermissions ?? undefined,
					},
					settings: {
						channelId: BigInt(channel.id),
						indexingEnabled: false,
						markSolutionEnabled: false,
						sendMarkSolutionInstructionsInNewThreads: false,
						autoThreadEnabled: false,
						forumGuidelinesConsentEnabled: false,
					},
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
						discordId: BigInt(thread.parentId),
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
						discordId: BigInt(thread.guild.id),
					});
				const server = serverLiveData;
				if (!server) {
					yield* Console.warn(
						`Server ${thread.guild.id} not found, skipping thread parity`,
					);
					return;
				}
				const aoThread = toAOChannel(thread);
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
				yield* syncChannel(newChannel);
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
				yield* database.private.channels.deleteChannel({
					id: BigInt(channel.id),
				});
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
				yield* syncChannel(newThread);
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
						discordId: BigInt(thread.id),
					});
				const existingChannel = channelLiveData;

				if (!existingChannel) {
					yield* Console.warn(
						`Thread ${thread.id} not found, skipping thread delete`,
					);
					return;
				}

				yield* database.private.channels.deleteChannel({
					id: BigInt(thread.id),
				});
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error deleting thread ${thread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("inviteDelete", (invite) =>
			Effect.gen(function* () {
				if (!invite.channel || invite.channel.isDMBased()) {
					return;
				}
				yield* syncChannel(invite.channel);
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
