import { Database, upsertMessage } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { toAODiscordAccount, toAOMessage } from "../utils/conversions";
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
						discordId: newMessage.guildId ?? "",
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
						id: newMessage.id,
					},
				);
				const existingMessage = messageLiveData;

				if (!existingMessage) {
					return;
				}

				const aoMessage = yield* Effect.promise(() =>
					toAOMessage(newMessage, server.discordId),
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
						if (result.storageId && aoMessage.attachments) {
							const attachment = aoMessage.attachments.find(
								(a) => a.id === result.attachmentId,
							);
							if (attachment) {
								attachment.storageId = result.storageId;
							}
						}
					}
				}

				yield* Effect.promise(() =>
					upsertMessage(
						{
							...aoMessage,
							questionId: existingMessage.questionId,
						},
						{ ignoreChecks: false },
					),
				).pipe(
					Effect.tap(() =>
						Console.log(
							`Updated message ${newMessage.id} from ${newMessage.author.tag}`,
						),
					),
					Effect.catchAll((error) =>
						Console.error(`Error updating message ${newMessage.id}:`, error),
					),
				);

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
						id: message.id,
					},
				);
				const existingMessage = messageLiveData;

				if (!existingMessage) {
					return;
				}

				yield* database.private.messages.deleteMessage({ id: message.id });
				yield* Console.log(`Deleted message ${message.id}`);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error deleting message ${message.id}:`, error),
				),
			),
		);

		yield* discord.client.on("messageDeleteBulk", (messages) =>
			Effect.gen(function* () {
				const messageIds: string[] = [];
				for (const [id] of messages) {
					messageIds.push(id);
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
						discordId: message.guildId ?? "",
					});
				const server = serverLiveData;

				if (!server) {
					yield* Console.warn(
						`Server ${message.guildId} not found in database, skipping message parity`,
					);
					return;
				}

				const aoMessage = yield* Effect.promise(() =>
					toAOMessage(message, server.discordId),
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
						if (result.storageId && aoMessage.attachments) {
							const attachment = aoMessage.attachments.find(
								(a) => a.id === result.attachmentId,
							);
							if (attachment) {
								attachment.storageId = result.storageId;
							}
						}
					}
				}

				yield* Effect.promise(() =>
					upsertMessage(aoMessage, { ignoreChecks: false }),
				).pipe(
					Effect.tap(() =>
						Console.log(
							`Maintained parity for message ${message.id} from ${message.author.tag}`,
						),
					),
					Effect.catchAll((error) =>
						Console.error(
							`Error maintaining message parity ${message.id}:`,
							error,
						),
					),
				);

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
