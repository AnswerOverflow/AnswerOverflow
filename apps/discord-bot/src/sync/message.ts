import type { DiscordAccount } from "@packages/database/convex/schema";
import { Database } from "@packages/database/database";
import { Console, Duration, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { eventsProcessed, syncOperations } from "../metrics";
import {
	uploadAttachmentsInBatches,
	uploadEmbedImagesInBatches,
} from "../utils/attachment-upload";
import { createBatchedQueue } from "../utils/batched-queue";
import {
	type ChannelKeyedItem,
	createChannelBatchedQueue,
} from "../utils/channel-batched-queue";
import {
	extractEmbedImagesToUpload,
	toAODiscordAccount,
	toAOMessage,
	toUpsertMessageArgs,
} from "../utils/conversions";
import { catchAllWithReport } from "../utils/error-reporting";
import { isHumanMessage } from "../utils/message-utils";

const BATCH_CONFIG = {
	maxBatchSize: process.env.NODE_ENV === "production" ? 3 : 1,
	maxWait: Duration.millis(3000),
} as const;

type MessageUpsertArgs = ReturnType<typeof toUpsertMessageArgs>;
type ChannelKeyedMessageArgs = MessageUpsertArgs & ChannelKeyedItem;

function toChannelKeyedArgs(args: MessageUpsertArgs): ChannelKeyedMessageArgs {
	return {
		...args,
		channelId: args.message.channelId.toString(),
	};
}

export const MessageParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		const messageQueue = yield* createChannelBatchedQueue<
			ChannelKeyedMessageArgs,
			unknown,
			Database
		>({
			process: (batch) =>
				Effect.gen(function* () {
					const channelId = batch[0]?.channelId ?? "unknown";
					yield* Effect.annotateCurrentSpan({
						"batch.size": batch.length.toString(),
						"batch.type": "messages",
						"channel.id": channelId,
					});
					yield* Effect.logDebug(
						`Processing message batch of ${batch.length} items for channel ${channelId}`,
					);
					yield* database.private.messages.upsertManyMessages({
						messages: batch.map(({ channelId: _, ...rest }) => rest),
						ignoreChecks: false,
					});
				}).pipe(Effect.withSpan("sync.message_batch")),
			maxBatchSize: BATCH_CONFIG.maxBatchSize,
			maxWait: BATCH_CONFIG.maxWait,
		});

		const accountQueue = yield* createBatchedQueue<
			DiscordAccount,
			unknown,
			Database
		>({
			process: (batch) =>
				Effect.gen(function* () {
					yield* Effect.annotateCurrentSpan({
						"batch.size": batch.length.toString(),
						"batch.type": "accounts",
					});
					yield* Effect.logDebug(
						`Processing account batch of ${batch.length} items`,
					);
					yield* database.private.discord_accounts.upsertManyDiscordAccounts({
						accounts: batch,
					});
				}).pipe(Effect.withSpan("sync.account_batch")),
			maxBatchSize: BATCH_CONFIG.maxBatchSize,
			maxWait: BATCH_CONFIG.maxWait,
		});

		yield* Effect.logInfo("Message parity batched queues initialized");

		yield* discord.client.on("messageUpdate", (_oldMessage, newMessage) =>
			Effect.gen(function* () {
				if (
					newMessage.channel.isDMBased() ||
					newMessage.channel.isVoiceBased()
				) {
					return;
				}

				if (!isHumanMessage(newMessage)) {
					return;
				}

				yield* Effect.annotateCurrentSpan({
					"discord.message_id": newMessage.id,
					"discord.channel_id": newMessage.channelId,
					"discord.guild_id": newMessage.guildId ?? "",
					"discord.author_id": newMessage.author.id,
				});
				yield* Metric.increment(eventsProcessed);
				yield* Metric.increment(syncOperations);

				const server = yield* database.private.servers.getServerByDiscordId({
					discordId: BigInt(newMessage.guildId ?? ""),
				});

				if (!server) {
					yield* Console.warn(
						`Server ${newMessage.guildId} not found, skipping message update`,
					);
					return;
				}

				const existingMessage = yield* database.private.messages.getMessageById(
					{
						id: BigInt(newMessage.id),
					},
				);

				if (!existingMessage) {
					return;
				}

				const data = yield* Effect.promise(() =>
					toAOMessage(newMessage, server.discordId.toString()),
				);

				if (newMessage.attachments.size > 0) {
					const attachmentsToUpload = Array.from(
						newMessage.attachments.values(),
					).map((att) => ({
						id: att.id,
						url: att.url,
						filename: att.name ?? "",
						contentType: att.contentType ?? undefined,
					}));

					yield* uploadAttachmentsInBatches(attachmentsToUpload).pipe(
						Effect.withSpan("sync.message.upload_attachments", {
							attributes: {
								"attachments.count": attachmentsToUpload.length.toString(),
							},
						}),
					);
				}

				yield* messageQueue.offer(
					toChannelKeyedArgs(toUpsertMessageArgs(data)),
				);

				if (newMessage.embeds.length > 0) {
					const embedImagesToUpload = extractEmbedImagesToUpload(newMessage);
					if (embedImagesToUpload.length > 0) {
						yield* uploadEmbedImagesInBatches(embedImagesToUpload).pipe(
							Effect.withSpan("sync.message.upload_embed_images", {
								attributes: {
									"embed_images.count": embedImagesToUpload.length.toString(),
								},
							}),
							catchAllWithReport((error) =>
								Console.warn(
									`Failed to upload embed images for message ${newMessage.id}:`,
									error,
								),
							),
						);
					}
				}

				yield* accountQueue.offer(toAODiscordAccount(newMessage.author));
			}).pipe(
				Effect.withSpan("event.message_update"),
				catchAllWithReport((error) =>
					Console.error(`Error updating message ${newMessage.id}:`, error),
				),
			),
		);

		yield* discord.client.on("messageDelete", (message) =>
			Effect.gen(function* () {
				if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
					return;
				}

				yield* Effect.annotateCurrentSpan({
					"discord.message_id": message.id,
					"discord.channel_id": message.channelId,
					"discord.guild_id": message.guildId ?? "",
				});
				yield* Metric.increment(eventsProcessed);

				const existingMessage = yield* database.private.messages.getMessageById(
					{
						id: BigInt(message.id),
					},
				);

				if (!existingMessage) {
					return;
				}

				yield* database.private.messages.deleteMessage({
					id: BigInt(message.id),
				});
				yield* Console.log(`Deleted message ${message.id}`);
			}).pipe(
				Effect.withSpan("event.message_delete"),
				catchAllWithReport((error) =>
					Console.error(`Error deleting message ${message.id}:`, error),
				),
			),
		);

		yield* discord.client.on("messageDeleteBulk", (messages) =>
			Effect.gen(function* () {
				const messageIds: bigint[] = [];
				for (const [id] of messages) {
					messageIds.push(BigInt(id));
				}

				if (messageIds.length === 0) {
					return;
				}

				yield* Effect.annotateCurrentSpan({
					"bulk_delete.count": messageIds.length.toString(),
				});
				yield* Metric.increment(eventsProcessed);

				yield* database.private.messages.deleteManyMessages({
					ids: messageIds,
				});
				yield* Console.log(`Bulk deleted ${messageIds.length} messages`);
			}).pipe(
				Effect.withSpan("event.message_delete_bulk"),
				catchAllWithReport((error) =>
					Console.error(`Error bulk deleting messages:`, error),
				),
			),
		);

		yield* discord.client.on("messageCreate", (message) =>
			Effect.gen(function* () {
				if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
					return;
				}

				if (!isHumanMessage(message)) {
					return;
				}

				yield* Effect.annotateCurrentSpan({
					"discord.message_id": message.id,
					"discord.channel_id": message.channelId,
					"discord.guild_id": message.guildId ?? "",
					"discord.author_id": message.author.id,
					"message.has_attachments": (message.attachments.size > 0).toString(),
					"message.has_embeds": (message.embeds.length > 0).toString(),
				});
				yield* Metric.increment(eventsProcessed);
				yield* Metric.increment(syncOperations);

				if (message.content === "!ping") {
					yield* Console.log("Received ping command!");
				}

				const server = yield* database.private.servers.getServerByDiscordId({
					discordId: BigInt(message.guildId ?? ""),
				});

				if (!server) {
					yield* Console.warn(
						`Server ${message.guildId} not found in database, skipping message parity`,
					);
					return;
				}

				const channelIdToCheck = message.channel.isThread()
					? message.channel.parentId
					: message.channelId;

				if (!channelIdToCheck) {
					return;
				}

				const channel = yield* database.private.channels.findChannelByDiscordId(
					{
						discordId: BigInt(channelIdToCheck),
					},
				);

				if (!channel) {
					return;
				}

				if (!channel.flags?.indexingEnabled) {
					return;
				}

				const data = yield* Effect.promise(() =>
					toAOMessage(message, server.discordId.toString()),
				);

				yield* messageQueue.offer(
					toChannelKeyedArgs(toUpsertMessageArgs(data)),
				);

				if (message.attachments.size > 0) {
					const attachmentsToUpload = Array.from(
						message.attachments.values(),
					).map((att) => ({
						id: att.id,
						url: att.url,
						filename: att.name ?? "",
						contentType: att.contentType ?? undefined,
					}));

					yield* uploadAttachmentsInBatches(attachmentsToUpload).pipe(
						Effect.withSpan("sync.message.upload_attachments", {
							attributes: {
								"attachments.count": attachmentsToUpload.length.toString(),
							},
						}),
					);
				}

				if (message.embeds.length > 0) {
					const embedImagesToUpload = extractEmbedImagesToUpload(message);
					if (embedImagesToUpload.length > 0) {
						yield* uploadEmbedImagesInBatches(embedImagesToUpload).pipe(
							Effect.withSpan("sync.message.upload_embed_images", {
								attributes: {
									"embed_images.count": embedImagesToUpload.length.toString(),
								},
							}),
							catchAllWithReport((error) =>
								Console.warn(
									`Failed to upload embed images for message ${message.id}:`,
									error,
								),
							),
						);
					}
				}

				yield* accountQueue.offer(toAODiscordAccount(message.author));
			}).pipe(
				Effect.withSpan("event.message_create"),
				catchAllWithReport((error) =>
					Console.error(`Error creating message ${message.id}:`, error),
				),
			),
		);
	}),
);
