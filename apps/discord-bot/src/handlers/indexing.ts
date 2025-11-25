import type { BaseMessageWithRelations } from "@packages/database/database";
import { Database } from "@packages/database/database";
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
	toBigIntIdRequired,
	toBigIntId,
} from "../utils/conversions";
import { isHumanMessage } from "../utils/message-utils";

const INDEXING_CONFIG = {
	scheduleInterval: Duration.hours(6),
	maxMessagesPerChannel: 10000,
	messagesPerPage: 100,
	channelProcessDelay: Duration.millis(100),
	guildProcessDelay: Duration.millis(500),
} as const;

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
			const fetchAfter = lastMessageId === "0" ? undefined : lastMessageId;
			const fetchedMessages = yield* discord.fetchChannelMessages(channelId, {
				limit: INDEXING_CONFIG.messagesPerPage,
				after: fetchAfter,
			});

			if (fetchedMessages.size === 0) {
				hasMore = false;
				break;
			}

			const sortedMessages = Arr.sort(
				Arr.fromIterable(fetchedMessages.values()),
				Order.mapInput(BigIntEffect.Order, (msg: Message) => BigInt(msg.id)),
			);

			messages.push(...sortedMessages);

			const lastMsg = sortedMessages[sortedMessages.length - 1];
			if (lastMsg && lastMsg.id !== lastMessageId) {
				lastMessageId = lastMsg.id;
			} else {
				hasMore = false;
			}

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

function fetchForumThreads(forumChannelId: string, forumChannelName: string) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const threads: AnyThreadChannel[] = [];

		const activeThreads = yield* discord.fetchActiveThreads(forumChannelId);

		threads.push(...Arr.fromIterable(activeThreads.threads.values()));

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

function storeMessages(
	messages: Message[],
	discordServerId: string,
	channelId: string,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (messages.length === 0) {
			yield* Effect.logDebug(`No messages to store for channel ${channelId}`);
			return;
		}

		const humanMessages = Arr.filter(messages, (msg) => isHumanMessage(msg));

		yield* Effect.logDebug(
			`Storing ${humanMessages.length} human messages (filtered from ${messages.length} total)`,
		);

		const aoMessages: BaseMessageWithRelations[] = [];
		for (const msg of humanMessages) {
			try {
				const aoMessage = yield* Effect.promise(() =>
					toAOMessage(msg, discordServerId),
				);
				aoMessages.push(aoMessage);
			} catch (error) {
				yield* Console.warn(`Failed to convert message ${msg.id}:`, error);
			}
		}

		const uniqueAuthors = HashMap.fromIterable(
			Arr.map(
				humanMessages,
				(msg) => [msg.author.id, toAODiscordAccount(msg.author)] as const,
			),
		);

		yield* Effect.forEach(
			Arr.fromIterable(HashMap.values(uniqueAuthors)),
			(author) =>
				database.private.discord_accounts.upsertDiscordAccount({
					account: author,
				}),
			{ concurrency: 10 },
		);

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

			const batchSize = 5;
			for (let i = 0; i < allAttachments.length; i += batchSize) {
				const batch = allAttachments.slice(i, i + batchSize);
				const uploadResults =
					yield* database.private.attachments.uploadManyAttachmentsFromUrls({
						attachments: batch,
					});

				for (const result of uploadResults) {
					if (result.storageId) {
						for (const msg of aoMessages) {
							const attachment = msg.attachments?.find(
								(a) => a.id.toString() === result.attachmentId,
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

		yield* Effect.forEach(
			aoMessages,
			(data) =>
				database.private.messages.upsertMessage({
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
				}),
			{ concurrency: 5 },
		);

		if (humanMessages.length > 0) {
			const lastMessage = humanMessages[humanMessages.length - 1];
			if (lastMessage) {
				const channelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: toBigIntIdRequired(channelId),
					});
				yield* Effect.sleep(Duration.millis(10));
				const currentChannel = channelLiveData;

				if (currentChannel) {
					const oldLastIndexed = currentChannel.lastIndexedSnowflake;
					const newLastIndexedBigInt = toBigIntIdRequired(lastMessage.id);

					yield* Effect.logDebug(
						`Updating lastIndexedSnowflake for channel ${channelId}: ${oldLastIndexed ?? "null"} -> ${newLastIndexedBigInt}`,
					);

					yield* database.private.channels.updateChannel({
						id: toBigIntIdRequired(channelId),
						channel: {
							id: currentChannel.id,
							serverId: currentChannel.serverId,
							name: currentChannel.name,
							type: currentChannel.type,
							parentId: currentChannel.parentId,
							inviteCode: currentChannel.inviteCode,
							archivedTimestamp: currentChannel.archivedTimestamp,
							solutionTagId: currentChannel.solutionTagId,
							lastIndexedSnowflake: newLastIndexedBigInt,
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

function indexTextChannel(
	channel: TextChannel | NewsChannel,
	discordServerId: string,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		const channelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: toBigIntIdRequired(channel.id),
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

		const messages = yield* fetchChannelMessages(
			channel.id,
			channel.name,
			lastIndexedSnowflake?.toString() ?? undefined,
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

		yield* storeMessages(messages, discordServerId, channel.id);

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
						yield* database.private.channels.upsertManyChannels({
							channels: [
								{
									create: toAOChannel(thread, discordServerId),
									update: toAOChannel(thread, discordServerId),
								},
							],
						});

						const threadChannelLiveData =
							yield* database.private.channels.findChannelByDiscordId({
								discordId: toBigIntIdRequired(thread.id),
							});
						yield* Effect.sleep(Duration.millis(10));
						const threadChannel = threadChannelLiveData;
						const threadLastIndexed = threadChannel?.lastIndexedSnowflake;

						const threadMessages = yield* fetchChannelMessages(
							thread.id,
							thread.name,
							threadLastIndexed?.toString() ?? undefined,
						);
						yield* storeMessages(threadMessages, discordServerId, thread.id);
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

function indexForumChannel(channel: ForumChannel, discordServerId: string) {
	return Effect.gen(function* () {
		const database = yield* Database;

		const channelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: toBigIntIdRequired(channel.id),
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

		const threads = yield* fetchForumThreads(channel.id, channel.name);

		const threadsToIndex = lastIndexedSnowflake
			? Arr.filter(
					threads,
					(thread) => BigInt(thread.id) > lastIndexedSnowflake,
				)
			: threads;

		yield* Effect.logDebug(
			`Found ${threads.length} total threads, ${threadsToIndex.length} new threads to index (filtered by lastIndexedSnowflake: ${lastIndexedSnowflake ?? "null"})`,
		);

		yield* Effect.forEach(
			threadsToIndex,
			(thread) =>
				Effect.gen(function* () {
					yield* database.private.channels.upsertManyChannels({
						channels: [
							{
								create: toAOChannel(thread, discordServerId),
								update: toAOChannel(thread, discordServerId),
							},
						],
					});

					const threadChannelLiveData =
						yield* database.private.channels.findChannelByDiscordId({
							discordId: toBigIntIdRequired(thread.id),
						});
					yield* Effect.sleep(Duration.millis(10));
					const threadChannel = threadChannelLiveData;
					const threadLastIndexed = threadChannel?.lastIndexedSnowflake;

					const threadMessages = yield* fetchChannelMessages(
						thread.id,
						thread.name,
						threadLastIndexed?.toString() ?? undefined,
					);
					yield* storeMessages(threadMessages, discordServerId, thread.id);

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
				const channelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: toBigIntIdRequired(channel.id),
					});
				yield* Effect.sleep(Duration.millis(10));
				const currentChannel = channelLiveData;

				if (currentChannel) {
					const oldLastIndexed = currentChannel.lastIndexedSnowflake;
					const newLastIndexedBigInt = toBigIntIdRequired(latestThread.id);

					yield* Effect.logDebug(
						`Updating forum lastIndexedSnowflake for ${channel.name} (${channel.id}): ${oldLastIndexed ?? "null"} -> ${newLastIndexedBigInt} (latest thread: ${latestThread.name})`,
					);

					yield* database.private.channels.updateChannel({
						id: toBigIntIdRequired(channel.id),
						channel: {
							id: currentChannel.id,
							serverId: currentChannel.serverId,
							name: currentChannel.name,
							type: currentChannel.type,
							parentId: currentChannel.parentId,
							inviteCode: currentChannel.inviteCode,
							archivedTimestamp: currentChannel.archivedTimestamp,
							solutionTagId: currentChannel.solutionTagId,
							lastIndexedSnowflake: newLastIndexedBigInt,
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

function indexGuild(guild: Guild) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		yield* Effect.logDebug(
			`Starting indexing for guild: ${guild.name} (${guild.id})`,
		);

		const database = yield* Database;

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: toBigIntIdRequired(guild.id),
			},
		);
		yield* Effect.sleep(Duration.millis(10));
		const server = serverLiveData;

		if (!server) {
			yield* Console.warn(`Server ${guild.id} not found in database, skipping`);
			return;
		}

		const channels = yield* discord.getChannels(guild.id);

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

		yield* Effect.forEach(
			indexableChannels,
			(channel: Channel) =>
				Effect.gen(function* () {
					if (channel.type === ChannelType.GuildForum) {
						yield* indexForumChannel(
							channel as ForumChannel,
							server.discordId.toString(),
						);
					} else if (
						channel.type === ChannelType.GuildText ||
						channel.type === ChannelType.GuildAnnouncement
					) {
						yield* indexTextChannel(
							channel as TextChannel | NewsChannel,
							server.discordId.toString(),
						);
					}

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

function runIndexing() {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const startTime = yield* Clock.currentTimeMillis;
		yield* Console.log("=== Starting indexing run ===");
		yield* Effect.logDebug("=== Starting indexing run ===");

		const guilds = yield* discord.getGuilds();
		yield* Console.log(`Found ${guilds.length} guilds to index`);
		yield* Effect.logDebug(`Found ${guilds.length} guilds to index`);

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

export function startIndexingLoop(runImmediately = true) {
	return Effect.gen(function* () {
		yield* Effect.logDebug(
			`Starting indexing loop - will run every ${INDEXING_CONFIG.scheduleInterval}`,
		);

		if (runImmediately) {
			yield* Effect.logDebug("Running initial indexing...");
			yield* runIndexing().pipe(
				Effect.catchAllCause((cause) =>
					Console.error("Error during initial indexing run:", cause),
				),
			);
		}

		const schedule = Schedule.fixed(INDEXING_CONFIG.scheduleInterval);

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
