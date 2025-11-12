import { Database, upsertMessage } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../discord-service";
import { handleAutoThread } from "../handlers/auto-thread";
import { toAODiscordAccount, toAOMessage } from "../utils/conversions";
import { isHumanMessage } from "../utils/message-utils";

/**
 * Layer that sets up message create/update/delete event handlers for parity
 */
export const MessageParityLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		// Subscribe to messageUpdate event
		yield* discord.client.on("messageUpdate", (_oldMessage, newMessage) =>
			Effect.gen(function* () {
				// Skip DMs and voice channels
				if (
					newMessage.channel.isDMBased() ||
					newMessage.channel.isVoiceBased()
				) {
					return;
				}

				// Skip bot messages
				if (!isHumanMessage(newMessage)) {
					return;
				}

				// Get server by Discord ID to get Convex ID
				const serverLiveData = yield* database.servers.getServerByDiscordId(
					newMessage.guildId ?? "",
				);
				const server = serverLiveData?.data;

				if (!server) {
					yield* Console.warn(
						`Server ${newMessage.guildId} not found, skipping message update`,
					);
					return;
				}

				// Check if message exists in database
				const messageLiveData = yield* database.messages.getMessageById(
					newMessage.id,
				);
				const existingMessage = messageLiveData?.data;

				if (!existingMessage) {
					// Message doesn't exist, might be a new message, skip
					return;
				}

				// Convert and update message, preserving questionId
				yield* Effect.promise(async () => {
					const aoMessage = await toAOMessage(newMessage, server._id);
					// Preserve questionId from existing message
					await upsertMessage(
						{
							...aoMessage,
							questionId: existingMessage.questionId,
						},
						{ ignoreChecks: false },
					);
				}).pipe(
					Effect.tap(() => Console.log(`Updated message ${newMessage.id}`)),
					Effect.catchAll((error) =>
						Console.error(`Error updating message ${newMessage.id}:`, error),
					),
				);
			}),
		);

		// Subscribe to messageDelete event
		yield* discord.client.on("messageDelete", (message) =>
			Effect.gen(function* () {
				// Skip DMs and voice channels
				if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
					return;
				}

				// Check if message exists in database
				const messageLiveData = yield* database.messages.getMessageById(
					message.id,
				);
				const existingMessage = messageLiveData?.data;

				if (!existingMessage) {
					// Message doesn't exist, skip
					return;
				}

				// Delete message from database
				yield* database.messages.deleteMessage(message.id);
				yield* Console.log(`Deleted message ${message.id}`);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error deleting message ${message.id}:`, error),
				),
			),
		);

		// Subscribe to messageBulkDelete event
		yield* discord.client.on("messageDeleteBulk", (messages) =>
			Effect.gen(function* () {
				// messages is a Collection<Snowflake, Message | PartialMessage>
				// Get all message IDs
				const messageIds: string[] = [];
				for (const [id] of messages) {
					messageIds.push(id);
				}

				if (messageIds.length === 0) {
					return;
				}

				// Delete messages from database
				yield* database.messages.deleteManyMessages(messageIds);
				yield* Console.log(`Bulk deleted ${messageIds.length} messages`);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(`Error bulk deleting messages:`, error),
				),
			),
		);

		// Subscribe to messageCreate event
		yield* discord.client.on("messageCreate", (message) =>
			Effect.gen(function* () {
				// Skip DMs and voice channels
				if (message.channel.isDMBased() || message.channel.isVoiceBased()) {
					return;
				}

				// Skip bot messages for now (can add later if needed)
				if (!isHumanMessage(message)) {
					return;
				}

				// Handle ping command
				if (message.content === "!ping") {
					yield* Console.log("Received ping command!");
				}

				// Get server by Discord ID to get Convex ID
				const serverLiveData = yield* database.servers.getServerByDiscordId(
					message.guildId ?? "",
				);
				const server = serverLiveData?.data;

				if (!server) {
					yield* Console.warn(
						`Server ${message.guildId} not found in database, skipping message parity`,
					);
					return;
				}

				// Convert message
				const aoMessage = yield* Effect.promise(() =>
					toAOMessage(message, server._id),
				);

				// Upload attachments if any
				if (message.attachments.size > 0) {
					// Get Discord URLs from original message before converting
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

					// Upload attachments and update storage IDs
					const uploadResults =
						yield* database.attachments.uploadManyAttachmentsFromUrls(
							attachmentsToUpload,
						);

					// Update attachment records with storage IDs
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

				// Maintain message parity with uploaded attachment storage IDs
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

				// Maintain Discord account parity for message author
				yield* database.discordAccounts
					.upsertDiscordAccount(toAODiscordAccount(message.author))
					.pipe(
						Effect.catchAll((error) =>
							Console.error(
								`Error maintaining Discord account parity ${message.author.id}:`,
								error,
							),
						),
					);

				// Handle auto thread
				const channelLiveData = yield* database.channels.getChannelByDiscordId(
					message.channel.id,
				);

				const channelSettings = channelLiveData?.data ?? null;

				// Run auto thread handler (errors are handled internally)
				yield* handleAutoThread(channelSettings, message).pipe(
					Effect.catchAll((error) =>
						Console.error("Error in auto thread handler:", error),
					),
				);
			}),
		);
	}),
);
