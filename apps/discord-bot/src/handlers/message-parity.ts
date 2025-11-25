import { Database } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import {
	toBigIntIdRequired,
	toAODiscordAccount,
	toAOMessage,
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
						discordId: toBigIntIdRequired(newMessage.guildId ?? ""),
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
						id: toBigIntIdRequired(newMessage.id),
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

					yield* Console.log(
						`Uploading ${attachmentsToUpload.length} attachments for updated message ${newMessage.id}`,
					);

					const uploadResults =
						yield* database.private.attachments.uploadManyAttachmentsFromUrls({
							attachments: attachmentsToUpload,
						});

					for (const result of uploadResults) {
						if (result.storageId && data.attachments) {
							const attachment = data.attachments.find(
								(a) => a.id === toBigIntIdRequired(result.attachmentId),
							);
							if (attachment) {
								attachment.storageId = result.storageId;
							}
						}
					}
				}

				yield* database.private.messages.upsertMessage({
					message: {
						id: data.id,
						authorId: data.authorId,
						serverId: data.serverId,
						channelId: data.channelId,
						parentChannelId: data.parentChannelId,
						childThreadId: data.childThreadId,
						questionId: data.questionId,
						referenceId: data.referenceId,
						applicationId: data.applicationId,
						interactionId: data.interactionId,
						webhookId: data.webhookId,
						content: data.content,
						flags: data.flags,
						type: data.type,
						pinned: data.pinned,
						nonce: data.nonce,
						tts: data.tts,
						embeds: data.embeds,
					},
					attachments: data.attachments,
					reactions: data.reactions,
					ignoreChecks: false,
				});

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
						id: toBigIntIdRequired(message.id),
					},
				);
				const existingMessage = messageLiveData;

				if (!existingMessage) {
					return;
				}

				yield* database.private.messages.deleteMessage({
					id: toBigIntIdRequired(message.id),
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
					messageIds.push(toBigIntIdRequired(id));
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
						discordId: toBigIntIdRequired(message.guildId ?? ""),
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

				if (message.attachments.size > 0) {
					const attachmentsToUpload = Array.from(
						message.attachments.values(),
					).map((att) => ({
						id: att.id,
						url: att.url,
						filename: att.name ?? "",
						contentType: att.contentType ?? undefined,
					}));

					yield* Console.log(
						`Uploading ${attachmentsToUpload.length} attachments for message ${message.id}`,
					);

					const uploadResults =
						yield* database.private.attachments.uploadManyAttachmentsFromUrls({
							attachments: attachmentsToUpload,
						});

					for (const result of uploadResults) {
						if (result.storageId && data.attachments) {
							const attachment = data.attachments.find(
								(a) => a.id === toBigIntIdRequired(result.attachmentId),
							);
							if (attachment) {
								attachment.storageId = result.storageId;
							}
						}
					}
				}

				yield* database.private.messages.upsertMessage({
					message: {
						id: data.id,
						authorId: data.authorId,
						serverId: data.serverId,
						channelId: data.channelId,
						parentChannelId: data.parentChannelId,
						childThreadId: data.childThreadId,
						questionId: data.questionId,
						referenceId: data.referenceId,
						applicationId: data.applicationId,
						interactionId: data.interactionId,
						webhookId: data.webhookId,
						content: data.content,
						flags: data.flags,
						type: data.type,
						pinned: data.pinned,
						nonce: data.nonce,
						tts: data.tts,
						embeds: data.embeds,
					},
					attachments: data.attachments,
					reactions: data.reactions,
					ignoreChecks: false,
				});
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
