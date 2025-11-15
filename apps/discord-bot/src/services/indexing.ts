import type { Id } from "@packages/database/convex/_generated/dataModel";
import type { BaseMessageWithRelations } from "@packages/database/database";
import { Database, upsertMessage } from "@packages/database/database";
import type {
	AnyThreadChannel,
	Channel,
	ForumChannel,
	Guild,
	Message,
	NewsChannel,
	TextChannel,
} from "discord.js";
import { ChannelType } from "discord.js";
import {
	Array as Arr,
	BigInt as BigIntEffect,
	Clock,
	Console,
	Duration,
	Effect,
	HashMap,
	Order,
	Schedule,
} from "effect";
import { Discord } from "../core/discord-service";
import {
	toAOChannel,
	toAODiscordAccount,
	toAOMessage,
} from "../utils/conversions";
import { isHumanMessage } from "../utils/message-utils";

/**
 * Configuration for indexing
 */
const INDEXING_CONFIG = {
	/** Run every 6 hours */
	scheduleInterval: Duration.hours(6),
	/** Maximum number of messages to fetch per channel */
	maxMessagesPerChannel: 10000,
	/** Maximum number of messages to fetch in a single API call */
	messagesPerPage: 100,
	/** Delay between processing channels to avoid rate limits */
	channelProcessDelay: Duration.millis(100),
	/** Delay between processing guilds */
	guildProcessDelay: Duration.millis(500),
} as const;

/**
 * Fetches all messages from a text-based channel, paginating through message history
 */
function fetchChannelMessages(
	channelId: string,
	channelName: string,
	startFromId?: string,
) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const messages: Message[] = [];
		let lastMessageId = startFromId ?? "0";
		let hasMore = true;

		if (startFromId) {
			yield* Effect.logDebug(
				`Fetching messages for ${channelName} (${channelId}) starting after message ${startFromId}`,
			);
		} else {
			yield* Effect.logDebug(
				`Fetching messages for ${channelName} (${channelId}) from beginning`,
			);
		}

		while (hasMore && messages.length < INDEXING_CONFIG.maxMessagesPerChannel) {
			// Fetch a page of messages
			const fetchAfter = lastMessageId === "0" ? undefined : lastMessageId;
			const fetchedMessages = yield* discord.fetchChannelMessages(channelId, {
				limit: INDEXING_CONFIG.messagesPerPage,
				after: fetchAfter,
			});

			if (fetchedMessages.size === 0) {
				hasMore = false;
				break;
			}

			// Convert to array and sort by ID (snowflake)
			const sortedMessages = Arr.sort(
				Arr.fromIterable(fetchedMessages.values()),
				Order.mapInput(BigIntEffect.Order, (msg: Message) => BigInt(msg.id)),
			);

			messages.push(...sortedMessages);

			// Update last message ID for next iteration
			const lastMsg = sortedMessages[sortedMessages.length - 1];
			if (lastMsg && lastMsg.id !== lastMessageId) {
				lastMessageId = lastMsg.id;
			} else {
				hasMore = false;
			}

			// If we haven't fetched a full page, we're done
			if (fetchedMessages.size < INDEXING_CONFIG.messagesPerPage) {
				hasMore = false;
			}
		}

		yield* Effect.logDebug(
			`Fetched ${messages.length} messages from channel ${channelName} (${channelId})`,
		);
		return messages;
	});
}

/**
 * Fetches all threads from a forum channel
 */
function fetchForumThreads(forumChannelId: string, forumChannelName: string) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const threads: AnyThreadChannel[] = [];

		// Fetch active threads
		const activeThreads = yield* discord.fetchActiveThreads(forumChannelId);

		threads.push(...Arr.fromIterable(activeThreads.threads.values()));

		// Fetch archived threads
		let hasMoreArchived = true;
		let beforeId: string | undefined;

		while (hasMoreArchived) {
			const archivedThreads = yield* discord.fetchArchivedThreads(
				forumChannelId,
				{ before: beforeId },
			);

			threads.push(...Arr.fromIterable(archivedThreads.threads.values()));

			if (!archivedThreads.hasMore || archivedThreads.threads.size === 0) {
				hasMoreArchived = false;
			} else {
				const lastThread = archivedThreads.threads.last();
				beforeId = lastThread?.id;
			}
		}

		yield* Effect.logDebug(
			`Found ${threads.length} threads in forum ${forumChannelName} (${forumChannelId})`,
		);
		return threads;
	});
}

/**
 * Stores fetched messages in the database
 */
function storeMessages(
	messages: Message[],
	serverConvexId: Id<"servers">,
	channelId: string,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (messages.length === 0) {
			yield* Effect.logDebug(`No messages to store for channel ${channelId}`);
			return;
		}

		// Filter to only human messages
		const humanMessages = Arr.filter(messages, (msg) => isHumanMessage(msg));

		yield* Effect.logDebug(
			`Storing ${humanMessages.length} human messages (filtered from ${messages.length} total)`,
		);

		// Convert messages to AO format
		const aoMessages: BaseMessageWithRelations[] = [];
		for (const msg of humanMessages) {
			try {
				const aoMessage = yield* Effect.promise(() =>
					toAOMessage(msg, serverConvexId),
				);
				aoMessages.push(aoMessage);
			} catch (error) {
				yield* Console.warn(`Failed to convert message ${msg.id}:`, error);
			}
		}

		// Store Discord accounts
		const uniqueAuthors = HashMap.fromIterable(
			Arr.map(
				humanMessages,
				(msg) => [msg.author.id, toAODiscordAccount(msg.author)] as const,
			),
		);

		yield* Effect.forEach(
			Arr.fromIterable(HashMap.values(uniqueAuthors)),
			(author) =>
				database.discord_accounts.upsertDiscordAccount({ account: author }),
			{ concurrency: 10 },
		);

		// Upload attachments and update storage IDs
		// Need to get Discord URLs from original messages since we removed them from schema
		const allAttachments = Arr.flatMap(humanMessages, (msg) =>
			Arr.map(Arr.fromIterable(msg.attachments.values()), (att) => ({
				id: att.id,
				url: att.url,
				filename: att.name ?? "",
				contentType: att.contentType ?? undefined,
			})),
		);

		if (allAttachments.length > 0) {
			yield* Effect.logDebug(
				`Uploading ${allAttachments.length} attachments...`,
			);

			// Upload attachments in batches to avoid overwhelming the system
			const batchSize = 5;
			for (let i = 0; i < allAttachments.length; i += batchSize) {
				const batch = allAttachments.slice(i, i + batchSize);
				const uploadResults =
					yield* database.attachments.uploadManyAttachmentsFromUrls({
						attachments: batch,
					});

				// Update the aoMessages with storage IDs
				for (const result of uploadResults) {
					if (result.storageId) {
						for (const msg of aoMessages) {
							const attachment = msg.attachments?.find(
								(a) => a.id === result.attachmentId,
							);
							if (attachment) {
								attachment.storageId = result.storageId;
							}
						}
					}
				}
			}

			yield* Effect.logDebug(
				`Successfully uploaded ${allAttachments.length} attachments`,
			);
		}

		// Store messages (with ignoreChecks: false to respect user settings)
		yield* Effect.forEach(
			aoMessages,
			(msg) =>
				Effect.promise(() => upsertMessage(msg, { ignoreChecks: false })),
			{ concurrency: 5 },
		);

		// Update channel's lastIndexedSnowflake
		if (humanMessages.length > 0) {
			const lastMessage = humanMessages[humanMessages.length - 1];
			if (lastMessage) {
				// Get current channel to preserve other fields
				const channelLiveData = yield* database.channels.findChannelByDiscordId(
					{ discordId: channelId },
				);
				yield* Effect.sleep(Duration.millis(10));
				const currentChannel = channelLiveData;

				if (currentChannel) {
					const oldLastIndexed = currentChannel.lastIndexedSnowflake;
					const newLastIndexed = lastMessage.id;

					yield* Effect.logDebug(
						`Updating lastIndexedSnowflake for channel ${channelId}: ${oldLastIndexed ?? "null"} -> ${newLastIndexed}`,
					);

					// Only pass the channel data fields, not system fields like _id, _creationTime, flags
					yield* database.channels.updateChannel({
						id: channelId,
						channel: {
							id: currentChannel.id,
							serverId: currentChannel.serverId,
							name: currentChannel.name,
							type: currentChannel.type,
							parentId: currentChannel.parentId,
							inviteCode: currentChannel.inviteCode,
							archivedTimestamp: currentChannel.archivedTimestamp,
							solutionTagId: currentChannel.solutionTagId,
							lastIndexedSnowflake: newLastIndexed,
						},
					});

					yield* Effect.logDebug(
						`Successfully updated lastIndexedSnowflake for channel ${channelId}`,
					);
				} else {
					yield* Effect.logDebug(
						`Warning: Could not update lastIndexedSnowflake for channel ${channelId} - channel not found in database`,
					);
				}
			}
		} else {
			yield* Effect.logDebug(
				`No messages to store, skipping lastIndexedSnowflake update for channel ${channelId}`,
			);
		}

		yield* Effect.logDebug(`Successfully stored ${aoMessages.length} messages`);
	});
}

/**
 * Indexes a single text or announcement channel
 */
function indexTextChannel(
	channel: TextChannel | NewsChannel,
	serverConvexId: Id<"servers">,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		// Check if channel has indexing enabled
		const channelLiveData = yield* database.channels.findChannelByDiscordId({
			discordId: channel.id,
		});
		yield* Effect.sleep(Duration.millis(10));
		const channelSettings = channelLiveData;

		if (!channelSettings?.flags.indexingEnabled) {
			return;
		}

		const lastIndexedSnowflake = channelSettings.lastIndexedSnowflake;
		yield* Effect.logDebug(
			`Indexing text channel ${channel.name} (${channel.id}) - lastIndexedSnowflake: ${lastIndexedSnowflake ?? "null (starting from beginning)"}`,
		);

		// Fetch messages
		const messages = yield* fetchChannelMessages(
			channel.id,
			channel.name,
			lastIndexedSnowflake ?? undefined,
		);

		if (messages.length > 0) {
			const firstMessageId = messages[0]?.id;
			const lastMessageId = messages[messages.length - 1]?.id;
			yield* Effect.logDebug(
				`Fetched messages range: ${firstMessageId} to ${lastMessageId} (${messages.length} total)`,
			);
		} else {
			yield* Effect.logDebug(
				`No new messages found after ${lastIndexedSnowflake ?? "beginning"}`,
			);
		}

		// Store messages
		yield* storeMessages(messages, serverConvexId, channel.id);

		// Process any threads found in messages
		const threadsToIndex = Arr.filter(
			Arr.map(messages, (msg) => msg.thread),
			(thread): thread is AnyThreadChannel =>
				thread !== null &&
				thread !== undefined &&
				(thread.type === ChannelType.PublicThread ||
					thread.type === ChannelType.AnnouncementThread),
		);

		if (threadsToIndex.length > 0) {
			yield* Effect.logDebug(
				`Found ${threadsToIndex.length} threads to index in channel ${channel.name}`,
			);

			yield* Effect.forEach(
				threadsToIndex,
				(thread) =>
					Effect.gen(function* () {
						// Upsert thread as a channel
						yield* database.channels.upsertManyChannels({
							channels: [
								{
									create: toAOChannel(thread, serverConvexId),
									update: toAOChannel(thread, serverConvexId),
								},
							],
						});

						// Get thread's lastIndexedSnowflake if it exists
						const threadChannelLiveData =
							yield* database.channels.findChannelByDiscordId({
								discordId: thread.id,
							});
						yield* Effect.sleep(Duration.millis(10));
						const threadChannel = threadChannelLiveData;
						const threadLastIndexed = threadChannel?.lastIndexedSnowflake;

						// Fetch and store thread messages
						const threadMessages = yield* fetchChannelMessages(
							thread.id,
							thread.name,
							threadLastIndexed ?? undefined,
						);
						yield* storeMessages(threadMessages, serverConvexId, thread.id);
					}).pipe(
						Effect.catchAll((error) =>
							Console.error(
								`Error indexing thread ${thread.name} (${thread.id}):`,
								error,
							),
						),
					),
				{ concurrency: 3 },
			);
		}
	});
}

/**
 * Indexes a forum channel by fetching all threads and their messages
 */
function indexForumChannel(
	channel: ForumChannel,
	serverConvexId: Id<"servers">,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		// Check if channel has indexing enabled
		const channelLiveData = yield* database.channels.findChannelByDiscordId({
			discordId: channel.id,
		});
		yield* Effect.sleep(Duration.millis(10));
		const channelSettings = channelLiveData;

		if (!channelSettings?.flags.indexingEnabled) {
			return;
		}

		const lastIndexedSnowflake = channelSettings.lastIndexedSnowflake;
		yield* Effect.logDebug(
			`Indexing forum ${channel.name} (${channel.id}) - lastIndexedSnowflake: ${lastIndexedSnowflake ?? "null"}`,
		);

		// Fetch all threads
		const threads = yield* fetchForumThreads(channel.id, channel.name);

		// Filter threads to only process ones newer than lastIndexedSnowflake
		const threadsToIndex = lastIndexedSnowflake
			? Arr.filter(
					threads,
					(thread) => BigInt(thread.id) > BigInt(lastIndexedSnowflake),
				)
			: threads;

		yield* Effect.logDebug(
			`Found ${threads.length} total threads, ${threadsToIndex.length} new threads to index (filtered by lastIndexedSnowflake: ${lastIndexedSnowflake ?? "null"})`,
		);

		// Index each thread
		yield* Effect.forEach(
			threadsToIndex,
			(thread) =>
				Effect.gen(function* () {
					// Upsert thread as a channel
					yield* database.channels.upsertManyChannels({
						channels: [
							{
								create: toAOChannel(thread, serverConvexId),
								update: toAOChannel(thread, serverConvexId),
							},
						],
					});

					// Get thread's lastIndexedSnowflake if it exists
					const threadChannelLiveData =
						yield* database.channels.findChannelByDiscordId({
							discordId: thread.id,
						});
					yield* Effect.sleep(Duration.millis(10));
					const threadChannel = threadChannelLiveData;
					const threadLastIndexed = threadChannel?.lastIndexedSnowflake;

					// Fetch and store thread messages
					const threadMessages = yield* fetchChannelMessages(
						thread.id,
						thread.name,
						threadLastIndexed ?? undefined,
					);
					yield* storeMessages(threadMessages, serverConvexId, thread.id);

					// Small delay to avoid rate limits
					yield* Effect.sleep(INDEXING_CONFIG.channelProcessDelay);
				}).pipe(
					Effect.catchAll((error) =>
						Console.error(
							`Error indexing thread ${thread.name} (${thread.id}):`,
							error,
						),
					),
				),
			{ concurrency: 2 },
		);

		// Update forum's lastIndexedSnowflake to the most recent thread ID
		if (threads.length > 0) {
			const sortedThreads = Arr.sort(
				threads,
				Order.reverse(
					Order.mapInput(BigIntEffect.Order, (thread: AnyThreadChannel) =>
						BigInt(thread.id),
					),
				),
			);
			const latestThread = sortedThreads[0];
			if (latestThread) {
				// Get current channel to preserve other fields
				const channelLiveData = yield* database.channels.findChannelByDiscordId(
					{
						discordId: channel.id,
					},
				);
				yield* Effect.sleep(Duration.millis(10));
				const currentChannel = channelLiveData;

				if (currentChannel) {
					const oldLastIndexed = currentChannel.lastIndexedSnowflake;
					const newLastIndexed = latestThread.id;

					yield* Effect.logDebug(
						`Updating forum lastIndexedSnowflake for ${channel.name} (${channel.id}): ${oldLastIndexed ?? "null"} -> ${newLastIndexed} (latest thread: ${latestThread.name})`,
					);

					// Only pass the channel data fields, not system fields like _id, _creationTime, flags
					yield* database.channels.updateChannel({
						id: channel.id,
						channel: {
							id: currentChannel.id,
							serverId: currentChannel.serverId,
							name: currentChannel.name,
							type: currentChannel.type,
							parentId: currentChannel.parentId,
							inviteCode: currentChannel.inviteCode,
							archivedTimestamp: currentChannel.archivedTimestamp,
							solutionTagId: currentChannel.solutionTagId,
							lastIndexedSnowflake: newLastIndexed,
						},
					});

					yield* Effect.logDebug(
						`Successfully updated forum lastIndexedSnowflake for ${channel.name}`,
					);
				} else {
					yield* Effect.logDebug(
						`Warning: Could not update lastIndexedSnowflake for forum ${channel.id} - channel not found in database`,
					);
				}
			}
		} else {
			yield* Effect.logDebug(
				`No threads found, skipping lastIndexedSnowflake update for forum ${channel.name}`,
			);
		}
	});
}

/**
 * Indexes a single guild (server) by processing all its channels
 */
function indexGuild(guild: Guild) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		yield* Effect.logDebug(
			`Starting indexing for guild: ${guild.name} (${guild.id})`,
		);

		const database = yield* Database;

		// Get server from database
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: guild.id,
		});
		yield* Effect.sleep(Duration.millis(10));
		const server = serverLiveData;

		if (!server) {
			yield* Console.warn(`Server ${guild.id} not found in database, skipping`);
			return;
		}

		// Get all channels
		const channels = yield* discord.getChannels(guild.id);

		// Filter to indexable channel types
		const indexableChannels = Arr.filter(
			channels,
			(channel) =>
				"type" in channel &&
				(channel.type === ChannelType.GuildText ||
					channel.type === ChannelType.GuildAnnouncement ||
					channel.type === ChannelType.GuildForum),
		);

		yield* Effect.logDebug(
			`Found ${indexableChannels.length} indexable channels in ${guild.name}`,
		);

		// Process each channel
		yield* Effect.forEach(
			indexableChannels,
			(channel: Channel) =>
				Effect.gen(function* () {
					if (channel.type === ChannelType.GuildForum) {
						yield* indexForumChannel(channel as ForumChannel, server._id);
					} else if (
						channel.type === ChannelType.GuildText ||
						channel.type === ChannelType.GuildAnnouncement
					) {
						yield* indexTextChannel(
							channel as TextChannel | NewsChannel,
							server._id,
						);
					}

					// Small delay between channels
					yield* Effect.sleep(INDEXING_CONFIG.channelProcessDelay);
				}).pipe(
					Effect.catchAll((error) => {
						const channelId = "id" in channel ? channel.id : "unknown";
						const channelName = "name" in channel ? channel.name : channelId;
						return Console.error(
							`Error indexing channel ${channelName}:`,
							error,
						);
					}),
				),
			{ concurrency: 2 },
		);

		yield* Effect.logDebug(`Completed indexing for guild: ${guild.name}`);
	});
}

/**
 * Main indexing function - indexes all guilds
 */
function runIndexing() {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const startTime = yield* Clock.currentTimeMillis;
		yield* Console.log("=== Starting indexing run ===");
		yield* Effect.logDebug("=== Starting indexing run ===");

		// Get all guilds
		const guilds = yield* discord.getGuilds();
		yield* Console.log(`Found ${guilds.length} guilds to index`);
		yield* Effect.logDebug(`Found ${guilds.length} guilds to index`);

		// Process each guild sequentially to avoid overwhelming the API
		yield* Effect.forEach(
			guilds,
			(guild) =>
				Effect.gen(function* () {
					yield* indexGuild(guild);
					yield* Effect.sleep(INDEXING_CONFIG.guildProcessDelay);
				}).pipe(
					Effect.catchAll((error) =>
						Console.error(`Error indexing guild ${guild.name}:`, error),
					),
				),
			{ concurrency: 1 },
		);

		const endTime = yield* Clock.currentTimeMillis;
		const duration = endTime - startTime;
		const hours = Math.floor(duration / 1000 / 60 / 60);
		const minutes = Math.floor((duration / 1000 / 60) % 60);
		const seconds = Math.floor((duration / 1000) % 60);

		yield* Effect.logDebug(
			`=== Indexing complete - took ${hours}h ${minutes}m ${seconds}s ===`,
		);
	}).pipe(
		Effect.catchAll((error) =>
			Console.error("Fatal error during indexing:", error),
		),
	);
}

/**
 * Starts the indexing loop that runs on a schedule
 */
export function startIndexingLoop(runImmediately = true) {
	return Effect.gen(function* () {
		yield* Effect.logDebug(
			`Starting indexing loop - will run every ${INDEXING_CONFIG.scheduleInterval}`,
		);

		// Run immediately if requested
		if (runImmediately) {
			yield* Effect.logDebug("Running initial indexing...");
			yield* runIndexing().pipe(
				Effect.catchAllCause((cause) =>
					Console.error("Error during initial indexing run:", cause),
				),
			);
		}

		// Create repeating schedule
		const schedule = Schedule.fixed(INDEXING_CONFIG.scheduleInterval);

		// Fork a fiber that runs the indexing on schedule
		yield* Effect.fork(
			Effect.repeat(runIndexing(), schedule).pipe(
				Effect.catchAllCause((cause) =>
					Console.error("Error in scheduled indexing run:", cause),
				),
			),
		);

		yield* Effect.logDebug("Indexing loop started successfully");
	});
}
