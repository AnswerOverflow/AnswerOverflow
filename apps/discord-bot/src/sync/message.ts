import type { DiscordAccount } from "@packages/database/convex/schema";
import { Database } from "@packages/database/database";
import { Console, Duration, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import {
	uploadAttachmentsInBatches,
	uploadEmbedImagesInBatches,
} from "../utils/attachment-upload";
import { createBatchedQueue } from "../utils/batched-queue";
import {
	extractEmbedImagesToUpload,
	toAODiscordAccount,
	toAOMessage,
	toUpsertMessageArgs,
} from "../utils/conversions";
import { catchAllWithReport } from "../utils/error-reporting";
import { isHumanMessage } from "../utils/message-utils";

const BATCH_CONFIG = {
	maxBatchSize: 100,
	maxWait: Duration.millis(10000),
} as const;

type MessageUpsertArgs = ReturnType<typeof toUpsertMessageArgs>;

export const MessageParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		const messageQueue = yield* createBatchedQueue<
			MessageUpsertArgs,
			unknown,
			Database
		>({
			process: (batch) =>
				Effect.gen(function* () {
					yield* Effect.logDebug(
						`Processing message batch of ${batch.length} items`,
					);
					yield* database.private.messages.upsertManyMessages({
						messages: batch,
						ignoreChecks: false,
					});
				}),
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
					yield* Effect.logDebug(
						`Processing account batch of ${batch.length} items`,
					);
					yield* database.private.discord_accounts.upsertManyDiscordAccounts({
						accounts: batch,
					});
				}),
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

					yield* uploadAttachmentsInBatches(attachmentsToUpload);
				}

				yield* messageQueue.offer(toUpsertMessageArgs(data));

				if (newMessage.embeds.length > 0) {
					const embedImagesToUpload = extractEmbedImagesToUpload(newMessage);
					if (embedImagesToUpload.length > 0) {
						yield* uploadEmbedImagesInBatches(embedImagesToUpload).pipe(
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
			}),
		);

		yield* discord.client.on("messageDelete", (message) =>
			Effect.gen(function* () {
				if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
					return;
				}

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

				yield* database.private.messages.deleteManyMessages({
					ids: messageIds,
				});
				yield* Console.log(`Bulk deleted ${messageIds.length} messages`);
			}).pipe(
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

				const data = yield* Effect.promise(() =>
					toAOMessage(message, server.discordId.toString()),
				);

				yield* messageQueue.offer(toUpsertMessageArgs(data));

				if (message.attachments.size > 0) {
					const attachmentsToUpload = Array.from(
						message.attachments.values(),
					).map((att) => ({
						id: att.id,
						url: att.url,
						filename: att.name ?? "",
						contentType: att.contentType ?? undefined,
					}));

					yield* uploadAttachmentsInBatches(attachmentsToUpload);
				}

				if (message.embeds.length > 0) {
					const embedImagesToUpload = extractEmbedImagesToUpload(message);
					if (embedImagesToUpload.length > 0) {
						yield* uploadEmbedImagesInBatches(embedImagesToUpload).pipe(
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
			}),
		);
	}),
);
