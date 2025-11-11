import {
	Database,
	DatabaseLayer,
	upsertMessage,
} from "@packages/database/database";
import { createOtelLayer } from "@packages/observability/otel";
import type { GuildChannel } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { registerCommands } from "./src/commands/register";
import { Discord, DiscordLayer } from "./src/discord-client-real";
import { handleAutoThread } from "./src/handlers/auto-thread";
import { handleDismissButtonInteraction } from "./src/handlers/dismiss-button";
import { handleLeaderboardCommand } from "./src/handlers/leaderboard-command";
import { handleManageAccountCommand } from "./src/handlers/manage-account-command";
import { handleMarkSolutionCommand } from "./src/handlers/mark-solution-command";
import { startIndexingLoop } from "./src/services/indexing";
import {
	isAllowedRootChannelType,
	toAOChannel,
	toAODiscordAccount,
	toAOMessage,
} from "./src/utils/conversions";
import { isHumanMessage } from "./src/utils/message-utils";

const program = Effect.gen(function* () {
	const discord = yield* Discord;
	const database = yield* Database;

	yield* discord.client.on("clientReady", (_client) =>
		Effect.gen(function* () {
			yield* Console.log("Normal client ready event");
			yield* Effect.void;
			return;
		}),
	);

	const allServers = yield* database.servers.publicGetAllServers();
	const serverCount = allServers?.data?.length ?? 0;
	yield* Console.log(`Initial server count: ${serverCount}`);

	// Subscribe to ready event
	yield* discord.client.on("clientReady", (client) =>
		Effect.gen(function* () {
			// Register slash commands
			yield* registerCommands().pipe(
				Effect.catchAll((error) =>
					Console.error("Error registering commands:", error),
				),
			);

			const servers = yield* database.servers.publicGetAllServers();
			// LiveData might not have data immediately, so we handle undefined
			const serverCount = servers?.data?.length ?? 0;
			yield* Console.log(
				`Logged in as ${client.user.tag}! ${serverCount} servers`,
			);

			// Start indexing loop
			yield* Console.log("Starting indexing loop...");
			yield* startIndexingLoop(true).pipe(
				Effect.catchAll((error) =>
					Console.error("Error starting indexing loop:", error),
				),
			);
			const guilds = yield* discord.getGuilds();
			// Upsert each server entry and sync channels
			yield* Effect.forEach(guilds, (guild) =>
				Effect.gen(function* () {
					yield* Console.log(`Upserting server ${guild.id} ${guild.name}`);
					// Upsert server
					yield* database.servers.upsertServer({
						discordId: guild.id,
						name: guild.name,
						icon: guild.icon ? guild.icon.toString() : undefined,
						description: guild.description ?? undefined,
						vanityInviteCode: guild.vanityURLCode ?? undefined,
						plan: "FREE",
						approximateMemberCount:
							guild.approximateMemberCount ?? guild.memberCount ?? 0,
					});
					const serverLiveData = yield* database.servers.getServerByDiscordId(
						guild.id,
					);
					if (serverLiveData?.data?._id) {
						yield* database.serverPreferences.upsertServerPreferences({
							serverId: serverLiveData?.data?._id,
							considerAllMessagesPublicEnabled: true,
						});
					}
					const server = serverLiveData?.data;

					if (!server) {
						yield* Console.warn(
							`Server ${guild.id} not found after upsert, skipping channel sync`,
						);
						return;
					}

					// Sync channels - only root channels (text, announcement, forum)
					const channels = yield* discord.getChannels(guild.id);
					const rootChannels = channels.filter((channel) => {
						if (!("guild" in channel) || !channel.guild) return false;
						if (!("type" in channel)) return false;
						if (!("name" in channel)) return false;
						return isAllowedRootChannelType(channel.type);
					}) as GuildChannel[];

					if (rootChannels.length > 0) {
						const channelsToUpsert = rootChannels.map((channel) => {
							const aoChannel = toAOChannel(channel, server._id);
							return {
								create: aoChannel,
								update: aoChannel, // Update with full channel data
							};
						});

						yield* database.channels.upsertManyChannels({
							channels: channelsToUpsert,
						});
						yield* Console.log(
							`Synced ${rootChannels.length} channels for server ${guild.name}`,
						);
					}
				}),
			);
		}),
	);

	// Subscribe to channelCreate event
	yield* discord.client.on("channelCreate", (channel) =>
		Effect.gen(function* () {
			// Skip DMs and non-guild channels
			if (!("guild" in channel) || !channel.guild) {
				return;
			}

			// Only sync root channels (text, announcement, forum)
			if (!("type" in channel) || !isAllowedRootChannelType(channel.type)) {
				return;
			}

			// Get server Convex ID
			const serverLiveData = yield* database.servers.getServerByDiscordId(
				channel.guild.id,
			);
			yield* Effect.sleep("10 millis");
			const server = serverLiveData?.data;

			if (!server) {
				yield* Console.warn(
					`Server ${channel.guild.id} not found, skipping channel sync`,
				);
				return;
			}

			// Upsert channel
			const aoChannel = toAOChannel(channel as GuildChannel, server._id);
			yield* database.channels.upsertManyChannels({
				channels: [
					{
						create: aoChannel,
						update: aoChannel, // Update with full channel data
					},
				],
			});
			yield* Console.log(`Synced new channel ${channel.name} (${channel.id})`);
		}).pipe(
			Effect.catchAll((error) =>
				Console.error(`Error syncing channel ${channel.id}:`, error),
			),
		),
	);

	// Subscribe to channelUpdate event
	yield* discord.client.on("channelUpdate", (_oldChannel, newChannel) =>
		Effect.gen(function* () {
			// Skip DMs and non-guild channels
			if (!("guild" in newChannel) || !newChannel.guild) {
				return;
			}

			// Only sync root channels
			if (
				!("type" in newChannel) ||
				!isAllowedRootChannelType(newChannel.type)
			) {
				return;
			}

			// Check if channel exists in database
			const channelLiveData = yield* database.channels.getChannelByDiscordId(
				newChannel.id,
			);
			yield* Effect.sleep("10 millis");
			const existingChannel = channelLiveData?.data;

			if (!existingChannel) {
				// Channel doesn't exist, might be a new channel, skip
				return;
			}

			// Get server Convex ID
			const serverLiveData = yield* database.servers.getServerByDiscordId(
				newChannel.guild.id,
			);
			yield* Effect.sleep("10 millis");
			const server = serverLiveData?.data;

			if (!server) {
				yield* Console.warn(
					`Server ${newChannel.guild.id} not found, skipping channel update`,
				);
				return;
			}

			// Update channel
			yield* database.channels.updateChannel({
				id: newChannel.id,
				channel: {
					...toAOChannel(newChannel as GuildChannel, server._id),
				},
			});
			yield* Console.log(
				`Updated channel ${newChannel.name} (${newChannel.id})`,
			);
		}).pipe(
			Effect.catchAll((error) =>
				Console.error(`Error updating channel ${newChannel.id}:`, error),
			),
		),
	);

	// Subscribe to channelDelete event
	yield* discord.client.on("channelDelete", (channel) =>
		Effect.gen(function* () {
			// Skip DMs and non-guild channels
			if (!("guild" in channel) || !channel.guild) {
				return;
			}

			// Delete channel from database
			yield* database.channels.deleteChannel(channel.id);
			yield* Console.log(`Deleted channel ${channel.id}`);
		}).pipe(
			Effect.catchAll((error) =>
				Console.error(`Error deleting channel ${channel.id}:`, error),
			),
		),
	);

	// Subscribe to messageUpdate event
	yield* discord.client.on("messageUpdate", (_oldMessage, newMessage) =>
		Effect.gen(function* () {
			// Skip DMs and voice channels
			if (newMessage.channel.isDMBased() || newMessage.channel.isVoiceBased()) {
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
			yield* Effect.sleep("10 millis");
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
			yield* Effect.sleep("10 millis");
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
			yield* Effect.sleep("10 millis");
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
			yield* Effect.sleep("10 millis"); // Wait for LiveData
			const server = serverLiveData?.data;

			if (!server) {
				yield* Console.warn(
					`Server ${message.guildId} not found in database, skipping message sync`,
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
					if (result.storageId) {
						const attachment = aoMessage.attachments.find(
							(a) => a.id === result.attachmentId,
						);
						if (attachment) {
							attachment.storageId = result.storageId;
						}
					}
				}
			}

			// Sync message with uploaded attachment storage IDs
			yield* Effect.promise(() =>
				upsertMessage(aoMessage, { ignoreChecks: false }),
			).pipe(
				Effect.tap(() =>
					Console.log(
						`Synced message ${message.id} from ${message.author.tag}`,
					),
				),
				Effect.catchAll((error) =>
					Console.error(`Error syncing message ${message.id}:`, error),
				),
			);

			// Sync Discord account for message author
			yield* database.discordAccounts
				.upsertDiscordAccount(toAODiscordAccount(message.author))
				.pipe(
					Effect.catchAll((error) =>
						Console.error(
							`Error syncing Discord account ${message.author.id}:`,
							error,
						),
					),
				);

			// Handle auto thread
			const channelLiveData = yield* database.channels.getChannelByDiscordId(
				message.channel.id,
			);

			// Wait a bit for LiveData to potentially load
			yield* Effect.sleep("10 millis");

			const channelSettings = channelLiveData?.data ?? null;

			// Run auto thread handler (errors are handled internally)
			yield* handleAutoThread(channelSettings, message).pipe(
				Effect.catchAll((error) =>
					Console.error("Error in auto thread handler:", error),
				),
			);
		}),
	);

	// Subscribe to interactionCreate event for slash commands and buttons
	yield* discord.client.on("interactionCreate", (interaction) =>
		Effect.gen(function* () {
			// Handle button interactions (dismiss button)
			if (interaction.isButton()) {
				if (interaction.customId.startsWith("dismiss:")) {
					yield* handleDismissButtonInteraction(interaction).pipe(
						Effect.catchAll((error) =>
							Console.error("Error in dismiss button handler:", error),
						),
					);
				}
				// Manage account buttons are handled by the collector in handleManageAccountCommand
				return;
			}

			// Handle context menu commands
			if (interaction.isContextMenuCommand()) {
				if (interaction.commandName === "✅ Mark Solution") {
					yield* Effect.scoped(
						handleMarkSolutionCommand(interaction).pipe(
							Effect.provide(DatabaseLayer),
							Effect.catchAll((error) =>
								Console.error("Error in mark solution command:", error),
							),
						),
					);
				}
				return;
			}

			// Handle chat input commands (slash commands)
			if (interaction.isChatInputCommand()) {
				if (interaction.commandName === "leaderboard") {
					yield* Effect.scoped(
						handleLeaderboardCommand(interaction).pipe(
							Effect.provide(DatabaseLayer),
							Effect.catchAll((error) =>
								Console.error("Error in leaderboard command:", error),
							),
						),
					);
				} else if (interaction.commandName === "manage-account") {
					yield* Effect.scoped(
						handleManageAccountCommand(interaction).pipe(
							Effect.provide(DatabaseLayer),
							Effect.catchAll((error) =>
								Console.error("Error in manage account command:", error),
							),
						),
					);
				}
				return;
			}

			// TODO: Add handlers for other slash commands (manage-account, consent)
		}),
	);

	// Login to Discord and wait for ready
	yield* discord.client.login();

	// Get and log guild count
	const guilds = yield* discord.getGuilds();
	yield* Console.log(`Bot is in ${guilds.length} guilds`);

	// Keep the bot running
	return yield* Effect.never;
});

// Run the program with the DiscordClientLayer and OpenTelemetry tracing
const OtelLayer = createOtelLayer("discord-bot");
Effect.runPromise(
	Effect.scoped(
		program.pipe(
			Effect.provide(Layer.mergeAll(DiscordLayer, DatabaseLayer, OtelLayer)),
		),
	),
).catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
