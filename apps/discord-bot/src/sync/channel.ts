import { Database } from "@packages/database/database";
import type {
	AnyThreadChannel,
	GuildBasedChannel,
	GuildChannel,
} from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { syncOperations } from "../metrics";
import {
	isAllowedRootChannel,
	isAllowedThreadChannel,
	toAOChannel,
} from "../utils/conversions";
import { catchAllWithReport } from "../utils/error-reporting";

export function syncChannel(
	channel: GuildBasedChannel | GuildChannel | AnyThreadChannel,
) {
	return Effect.gen(function* () {
		yield* Effect.annotateCurrentSpan({
			"discord.channel_id": channel.id,
			"discord.channel_name": channel.name,
			"discord.guild_id": channel.guildId,
		});
		yield* Metric.increment(syncOperations);

		const database = yield* Database;

		const discordChannelData = yield* toAOChannel(channel);

		yield* database.private.channels.upsertChannel({
			channel: discordChannelData,
		});

		if (channel.isThread() && channel.parentId) {
			const appliedTags = channel.appliedTags;
			yield* database.private.threadTags.syncThreadTags({
				threadId: BigInt(channel.id),
				parentChannelId: BigInt(channel.parentId),
				tagIds: appliedTags.map((tagId) => BigInt(tagId)),
			});
		}
	}).pipe(
		Effect.withSpan("sync.channel"),
		catchAllWithReport((error) =>
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
				yield* Effect.annotateCurrentSpan({
					"discord.channel_id": channel.id,
					"discord.channel_name": channel.name,
					"discord.guild_id": channel.guildId,
				});
				yield* syncChannel(channel);
			}).pipe(
				Effect.withSpan("event.channel_create"),
				catchAllWithReport((error) =>
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
				yield* Effect.annotateCurrentSpan({
					"discord.thread_id": thread.id,
					"discord.thread_name": thread.name,
					"discord.parent_channel_id": thread.parentId,
					"discord.guild_id": thread.guild.id,
				});

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
				Effect.withSpan("event.thread_create"),
				catchAllWithReport((error) =>
					Console.error(`Error maintaining thread parity ${thread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("channelUpdate", (_oldChannel, newChannel) =>
			Effect.gen(function* () {
				if (!isAllowedRootChannel(newChannel)) {
					return;
				}
				yield* Effect.annotateCurrentSpan({
					"discord.channel_id": newChannel.id,
					"discord.channel_name": newChannel.name,
					"discord.guild_id": newChannel.guildId,
				});
				yield* syncChannel(newChannel);
			}).pipe(
				Effect.withSpan("event.channel_update"),
				catchAllWithReport((error) =>
					Console.error(`Error updating channel ${newChannel.id}:`, error),
				),
			),
		);

		yield* discord.client.on("channelDelete", (channel) =>
			Effect.gen(function* () {
				if (!isAllowedRootChannel(channel)) {
					return;
				}
				yield* Effect.annotateCurrentSpan({
					"discord.channel_id": channel.id,
					"discord.channel_name": channel.name,
					"discord.guild_id": channel.guildId,
				});
				yield* database.private.channels.deleteChannel({
					id: BigInt(channel.id),
				});
			}).pipe(
				Effect.withSpan("event.channel_delete"),
				catchAllWithReport((error) =>
					Console.error(`Error deleting channel ${channel.id}:`, error),
				),
			),
		);

		yield* discord.client.on("threadUpdate", (_oldThread, newThread) =>
			Effect.gen(function* () {
				if (!isAllowedThreadChannel(newThread)) {
					return;
				}
				yield* Effect.annotateCurrentSpan({
					"discord.thread_id": newThread.id,
					"discord.thread_name": newThread.name,
					"discord.parent_channel_id": newThread.parentId,
					"discord.guild_id": newThread.guild.id,
				});
				yield* syncChannel(newThread);
			}).pipe(
				Effect.withSpan("event.thread_update"),
				catchAllWithReport((error) =>
					Console.error(`Error updating thread ${newThread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("threadDelete", (thread) =>
			Effect.gen(function* () {
				if (!isAllowedThreadChannel(thread)) {
					return;
				}
				yield* Effect.annotateCurrentSpan({
					"discord.thread_id": thread.id,
					"discord.thread_name": thread.name,
					"discord.guild_id": thread.guild.id,
				});

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
				Effect.withSpan("event.thread_delete"),
				catchAllWithReport((error) =>
					Console.error(`Error deleting thread ${thread.id}:`, error),
				),
			),
		);

		yield* discord.client.on("inviteDelete", (invite) =>
			Effect.gen(function* () {
				if (!invite.channel || invite.channel.isDMBased()) {
					return;
				}
				yield* Effect.annotateCurrentSpan({
					"discord.invite_code": invite.code,
					"discord.channel_id": invite.channel.id,
					"discord.guild_id": invite.channel.guildId,
				});
				yield* syncChannel(invite.channel);
			}).pipe(
				Effect.withSpan("event.invite_delete"),
				catchAllWithReport((error) =>
					Console.error(
						`Error removing invite code from channel (invite: ${invite.code}):`,
						error,
					),
				),
			),
		);
	}),
);
