import { Database } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import {
	uploadAttachmentsInBatches,
	uploadEmbedImagesInBatches,
} from "../utils/attachment-upload";
import {
	extractEmbedImagesToUpload,
	toAODiscordAccount,
	toAOMessage,
	toUpsertMessageArgs,
} from "../utils/conversions";
import { isHumanMessage } from "../utils/message-utils";

export const MessageParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

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

				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: BigInt(newMessage.guildId ?? ""),
					});
				const server = serverLiveData;

				if (!server) {
					yield* Console.warn(
						`Server ${newMessage.guildId} not found, skipping message update`,
					);
					return;
				}

				const messageLiveData = yield* database.private.messages.getMessageById(
					{
						id: BigInt(newMessage.id),
					},
				);
				const existingMessage = messageLiveData;

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

				yield* database.private.messages.upsertMessage({
					...toUpsertMessageArgs(data),
					ignoreChecks: false,
				});

				if (newMessage.embeds.length > 0) {
					const embedImagesToUpload = extractEmbedImagesToUpload(newMessage);
					if (embedImagesToUpload.length > 0) {
						yield* uploadEmbedImagesInBatches(embedImagesToUpload).pipe(
							Effect.catchAll((error) =>
								Console.warn(
									`Failed to upload embed images for message ${newMessage.id}:`,
									error,
								),
							),
						);
					}
				}

				yield* database.private.discord_accounts
					.upsertDiscordAccount({
						account: toAODiscordAccount(newMessage.author),
					})
					.pipe(
						Effect.catchAll((error) =>
							Console.error(
								`Error maintaining Discord account parity ${newMessage.author.id}:`,
								error,
							),
						),
					);
			}),
		);

		yield* discord.client.on("messageDelete", (message) =>
			Effect.gen(function* () {
				if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
					return;
				}

				const messageLiveData = yield* database.private.messages.getMessageById(
					{
						id: BigInt(message.id),
					},
				);
				const existingMessage = messageLiveData;

				if (!existingMessage) {
					return;
				}

				yield* database.private.messages.deleteMessage({
					id: BigInt(message.id),
				});
				yield* Console.log(`Deleted message ${message.id}`);
			}).pipe(
				Effect.catchAll((error) =>
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
				Effect.catchAll((error) =>
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

				const serverLiveData =
					yield* database.private.servers.getServerByDiscordId({
						discordId: BigInt(message.guildId ?? ""),
					});
				const server = serverLiveData;

				if (!server) {
					yield* Console.warn(
						`Server ${message.guildId} not found in database, skipping message parity`,
					);
					return;
				}

				const data = yield* Effect.promise(() =>
					toAOMessage(message, server.discordId.toString()),
				);

				yield* database.private.messages.upsertMessage({
					...toUpsertMessageArgs(data),
					ignoreChecks: false,
				});

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
							Effect.catchAll((error) =>
								Console.warn(
									`Failed to upload embed images for message ${message.id}:`,
									error,
								),
							),
						);
					}
				}

				yield* database.private.discord_accounts
					.upsertDiscordAccount({ account: toAODiscordAccount(message.author) })
					.pipe(
						Effect.catchAll((error) =>
							Console.error(
								`Error maintaining Discord account parity ${message.author.id}:`,
								error,
							),
						),
					);
			}),
		);
	}),
);
