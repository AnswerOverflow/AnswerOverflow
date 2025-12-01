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
		const database = yield* Database;

		const discordChannelData = yield* toAOChannel(channel);

		yield* database.private.channels.upsertChannel({
			channel: discordChannelData,
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
				yield* syncChannel(channel);
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
				yield* syncChannel(thread);
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
