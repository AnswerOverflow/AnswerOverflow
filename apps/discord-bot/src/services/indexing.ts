import { Database } from "@packages/database/database";
import type {
	AnyThreadChannel,
	Channel,
	ForumChannel,
	Guild,
	GuildChannel,
	Message,
	NewsChannel,
	TextChannel,
} from "discord.js";
import { ChannelType, PermissionFlagsBits } from "discord.js";
import {
	Array as Arr,
	BigInt as BigIntEffect,
	Clock,
	Console,
	Duration,
	Effect,
	HashMap,
	Layer,
	Order,
	Predicate,
	Schedule,
} from "effect";
import { Discord } from "../core/discord-service";
import { syncChannel } from "../sync/channel";
import { syncGuild } from "../sync/server";
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

function canBotViewChannel(channel: GuildChannel): boolean {
	const permissions = channel.permissionsFor(channel.client.user);
	if (!permissions) return false;
	return permissions.has([
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.ReadMessageHistory,
	]);
}

function isIndexableMessage(message: Message): boolean {
	if (message.system) return false;
	return true;
}

function ensureInviteCode(
	channel: TextChannel | NewsChannel | ForumChannel,
	channelSettings: { flags: { inviteCode?: string } } | null,
) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		if (channelSettings?.flags.inviteCode) {
			return;
		}

		const permissions = channel.permissionsFor(channel.client.user);
		const canMakeInvites = permissions?.has(
			PermissionFlagsBits.CreateInstantInvite,
		);
		const vanityURLCode = channel.guild.vanityURLCode;

		if (!canMakeInvites && !vanityURLCode) {
			return;
		}

		const inviteCode = canMakeInvites
			? yield* discord
					.callClient(() =>
						channel.createInvite({
							maxAge: 0,
							maxUses: 0,
							reason: "Channel indexing enabled invite",
							unique: false,
							temporary: false,
						}),
					)
					.pipe(
						Effect.map((invite) => invite.code),
						Effect.catchAll((error) =>
							Console.warn(
								`Failed to create invite for channel ${channel.name} (${channel.id}):`,
								error,
							).pipe(Effect.map(() => null)),
						),
					)
			: vanityURLCode;

		if (inviteCode) {
			yield* database.private.channels.updateChannelSettings({
				channelId: BigInt(channel.id),
				settings: {
					inviteCode,
				},
			});
			yield* Effect.logDebug(
				`Created invite code ${inviteCode} for channel ${channel.name} (${channel.id})`,
			);
		}
	});
}

const INDEXING_CONFIG = {
	scheduleInterval: Duration.hours(6),
	maxMessagesPerChannel: 10000,
	messagesPerPage: 100,
	channelProcessDelay: Duration.millis(100),
	guildProcessDelay: Duration.millis(500),
	convexBatchSize: 500,
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
			const fetchedMessages = yield* discord.fetchChannelMessages(channelId, {
				limit: INDEXING_CONFIG.messagesPerPage,
				after: lastMessageId,
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

		const indexableMessages = Arr.filter(messages, (msg) =>
			isIndexableMessage(msg),
		);

		yield* Effect.logDebug(
			`Storing ${indexableMessages.length} indexable messages (filtered from ${messages.length} total)`,
		);

		const aoMessages = yield* Effect.forEach(
			indexableMessages,
			(msg) =>
				Effect.tryPromise(() => toAOMessage(msg, discordServerId)).pipe(
					Effect.catchAll((error) =>
						Effect.gen(function* () {
							yield* Console.warn(
								`Failed to convert message ${msg.id}:`,
								error,
							);
							return null;
						}),
					),
				),
			{ concurrency: "unbounded" },
		).pipe(Effect.map(Arr.filter(Predicate.isNotNull)));

		const uniqueAuthors = Arr.fromIterable(
			HashMap.values(
				HashMap.fromIterable(
					Arr.map(
						indexableMessages,
						(msg) => [msg.author.id, toAODiscordAccount(msg.author)] as const,
					),
				),
			),
		);

		if (uniqueAuthors.length > 0) {
			const authorChunks = Arr.chunksOf(
				uniqueAuthors,
				INDEXING_CONFIG.convexBatchSize,
			);
			yield* Effect.forEach(
				authorChunks,
				(chunk) =>
					database.private.discord_accounts.upsertManyDiscordAccounts({
						accounts: chunk,
					}),
				{ concurrency: 3 },
			);
		}

		const botMessages = Arr.filter(indexableMessages, (msg) => msg.author.bot);
		if (botMessages.length > 0) {
			const uniqueBotIds = Arr.dedupe(
				Arr.map(botMessages, (msg) => msg.author.id),
			);

			const botIdChunks = Arr.chunksOf(
				uniqueBotIds,
				INDEXING_CONFIG.convexBatchSize,
			);
			const existingSettings = yield* Effect.forEach(
				botIdChunks,
				(chunk) =>
					database.private.user_server_settings.findManyUserServerSettings({
						settings: Arr.map(chunk, (botId) => ({
							userId: BigInt(botId),
							serverId: BigInt(discordServerId),
						})),
					}),
				{ concurrency: 1 },
			).pipe(Effect.map(Arr.flatten));

			const existingSettingsMap = HashMap.fromIterable(
				Arr.map(existingSettings, (s) => [s.userId, s] as const),
			);

			const botSettings = Arr.map(uniqueBotIds, (botId) => {
				const existing = HashMap.get(existingSettingsMap, BigInt(botId)).pipe(
					(opt) => (opt._tag === "Some" ? opt.value : null),
				);
				return {
					serverId: BigInt(discordServerId),
					userId: BigInt(botId),
					permissions: existing?.permissions ?? 0,
					canPubliclyDisplayMessages: true,
					messageIndexingDisabled: existing?.messageIndexingDisabled ?? false,
					apiCallsUsed: existing?.apiCallsUsed ?? 0,
				};
			});

			const botSettingsChunks = Arr.chunksOf(
				botSettings,
				INDEXING_CONFIG.convexBatchSize,
			);
			yield* Effect.forEach(
				botSettingsChunks,
				(chunk) =>
					database.private.user_server_settings.upsertManyBotUserServerSettings(
						{
							settings: chunk,
						},
					),
				{ concurrency: 1 },
			);
		}

		const allAttachments = Arr.flatMap(indexableMessages, (msg) =>
			Arr.map(Arr.fromIterable(msg.attachments.values()), (att) => ({
				id: att.id,
				url: att.url,
				filename: att.name ?? "",
				contentType: att.contentType ?? undefined,
			})),
		);

		const messageChunks = Arr.chunksOf(
			Arr.map(aoMessages, (data) => toUpsertMessageArgs(data)),
			INDEXING_CONFIG.convexBatchSize,
		);
		yield* Effect.forEach(
			messageChunks,
			(chunk) =>
				database.private.messages.upsertManyMessages({
					messages: chunk,
					ignoreChecks: false,
				}),
			{ concurrency: 1 },
		);

		if (allAttachments.length > 0) {
			yield* uploadAttachmentsInBatches(allAttachments);
		}

		const allEmbedImages = Arr.flatMap(indexableMessages, (msg) =>
			extractEmbedImagesToUpload(msg),
		);

		if (allEmbedImages.length > 0) {
			yield* uploadEmbedImagesInBatches(allEmbedImages).pipe(
				Effect.catchAll((error) =>
					Console.warn(
						`Failed to upload embed images for channel ${channelId}:`,
						error,
					),
				),
			);
		}

		if (indexableMessages.length > 0) {
			const sortedMessages = Arr.sort(
				indexableMessages,
				Order.reverse(
					Order.mapInput(BigIntEffect.Order, (msg: Message) => BigInt(msg.id)),
				),
			);
			const lastMessage = sortedMessages[0];
			if (lastMessage) {
				const newLastIndexedBigInt = BigInt(lastMessage.id);

				yield* Effect.logDebug(
					`Updating lastIndexedSnowflake for channel ${channelId} to ${newLastIndexedBigInt}`,
				);

				yield* database.private.channels.updateChannelSettings({
					channelId: BigInt(channelId),
					settings: {
						lastIndexedSnowflake: newLastIndexedBigInt,
					},
				});

				yield* Effect.logDebug(
					`Successfully updated lastIndexedSnowflake for channel ${channelId}`,
				);
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

		if (!canBotViewChannel(channel)) {
			yield* Effect.logDebug(
				`Bot cannot view channel ${channel.name} (${channel.id}), skipping`,
			);
			return;
		}

		const channelSettings =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(channel.id),
			});

		if (!channelSettings?.flags.indexingEnabled) {
			return;
		}

		const lastIndexedSnowflake = channelSettings.flags.lastIndexedSnowflake;
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

		const threadsToIndex = Arr.sort(
			Arr.filter(
				Arr.map(messages, (msg) => msg.thread),
				(thread): thread is AnyThreadChannel =>
					thread !== null &&
					thread !== undefined &&
					(thread.type === ChannelType.PublicThread ||
						thread.type === ChannelType.AnnouncementThread),
			),
			Order.mapInput(BigIntEffect.Order, (thread: AnyThreadChannel) =>
				BigInt(thread.id),
			),
		);

		if (threadsToIndex.length > 0) {
			yield* Effect.logDebug(
				`Found ${threadsToIndex.length} threads to index in channel ${channel.name}`,
			);

			yield* Effect.forEach(
				threadsToIndex,
				(thread) =>
					Effect.gen(function* () {
						yield* syncChannel(thread);

						const threadChannelLiveData =
							yield* database.private.channels.findChannelByDiscordId({
								discordId: BigInt(thread.id),
							});
						yield* Effect.sleep(Duration.millis(10));
						const threadChannel = threadChannelLiveData;
						const threadLastIndexed =
							threadChannel?.flags?.lastIndexedSnowflake;

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
				{ concurrency: 1 },
			);
		}

		yield* ensureInviteCode(channel, channelSettings);
	});
}

function indexForumChannel(channel: ForumChannel, discordServerId: string) {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (!canBotViewChannel(channel)) {
			yield* Effect.logDebug(
				`Bot cannot view forum ${channel.name} (${channel.id}), skipping`,
			);
			return;
		}

		const channelSettings =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(channel.id),
			});

		if (!channelSettings?.flags.indexingEnabled) {
			return;
		}

		const lastIndexedSnowflake = channelSettings.flags.lastIndexedSnowflake;
		yield* Effect.logDebug(
			`Indexing forum ${channel.name} (${channel.id}) - lastIndexedSnowflake: ${lastIndexedSnowflake ?? "null"}`,
		);

		const threads = yield* fetchForumThreads(channel.id, channel.name);

		const newThreads = lastIndexedSnowflake
			? Arr.filter(
					threads,
					(thread) => BigInt(thread.id) > lastIndexedSnowflake,
				)
			: threads;

		yield* Effect.logDebug(
			`Found ${threads.length} total threads, ${newThreads.length} new threads (filtered by forum lastIndexedSnowflake: ${lastIndexedSnowflake ?? "null"})`,
		);

		const threadIds = Arr.map(threads, (t) => BigInt(t.id));
		const threadIdChunks = Arr.chunksOf(
			threadIds,
			INDEXING_CONFIG.convexBatchSize,
		);
		const threadChannels = yield* Effect.forEach(
			threadIdChunks,
			(chunk) =>
				database.private.channels.findChannelsByDiscordIds({
					discordIds: chunk,
				}),
			{ concurrency: 1 },
		).pipe(Effect.map(Arr.flatten));
		const threadChannelMap = HashMap.fromIterable(
			Arr.map(threadChannels, (c) => [c.id, c] as const),
		);

		const outOfDateThreads = Arr.filter(threads, (thread) => {
			const threadChannel = HashMap.get(
				threadChannelMap,
				BigInt(thread.id),
			).pipe((opt) => (opt._tag === "Some" ? opt.value : null));
			const threadLastIndexed = threadChannel?.flags?.lastIndexedSnowflake;

			if (!threadLastIndexed) {
				return true;
			}

			const discordLastMessageId = thread.lastMessageId ?? thread.id;
			return BigInt(discordLastMessageId) > threadLastIndexed;
		});

		const threadsToIndex = Arr.sort(
			Arr.dedupe([...newThreads, ...outOfDateThreads]),
			Order.mapInput(BigIntEffect.Order, (thread: AnyThreadChannel) =>
				BigInt(thread.id),
			),
		);

		const totalThreadsToIndex = threadsToIndex.length;

		if (totalThreadsToIndex > 0) {
			yield* Console.log(
				`Forum ${channel.name}: Indexing ${totalThreadsToIndex} threads (${outOfDateThreads.length} with new messages, ${newThreads.length} new)`,
			);
		} else {
			yield* Effect.logDebug(`Forum ${channel.name}: No threads to index`);
		}

		let completedThreads = 0;

		yield* Effect.forEach(
			threadsToIndex,
			(thread) =>
				Effect.gen(function* () {
					yield* syncChannel(thread);

					const threadChannel = HashMap.get(
						threadChannelMap,
						BigInt(thread.id),
					).pipe((opt) => (opt._tag === "Some" ? opt.value : null));
					const threadLastIndexed = threadChannel?.flags?.lastIndexedSnowflake;

					const threadMessages = yield* fetchChannelMessages(
						thread.id,
						thread.name,
						threadLastIndexed?.toString() ?? undefined,
					);
					yield* storeMessages(threadMessages, discordServerId, thread.id);

					completedThreads++;
					if (
						completedThreads % 10 === 0 ||
						completedThreads === totalThreadsToIndex
					) {
						yield* Console.log(
							`Forum ${channel.name}: ${completedThreads}/${totalThreadsToIndex} threads indexed`,
						);
					}

					yield* Effect.sleep(INDEXING_CONFIG.channelProcessDelay);
				}).pipe(
					Effect.catchAll((error) => {
						completedThreads++;
						return Console.error(
							`Forum ${channel.name}: Error indexing thread ${thread.name} (${thread.id}):`,
							error,
						);
					}),
				),
			{ concurrency: 3 },
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
				const oldLastIndexed = channelSettings.flags?.lastIndexedSnowflake;
				const newLastIndexedBigInt = BigInt(latestThread.id);

				yield* Effect.logDebug(
					`Updating forum lastIndexedSnowflake for ${channel.name} (${channel.id}): ${oldLastIndexed ?? "null"} -> ${newLastIndexedBigInt} (latest thread: ${latestThread.name})`,
				);

				yield* database.private.channels.updateChannelSettings({
					channelId: BigInt(channel.id),
					settings: {
						lastIndexedSnowflake: newLastIndexedBigInt,
					},
				});

				yield* Effect.logDebug(
					`Successfully updated forum lastIndexedSnowflake for ${channel.name}`,
				);
			}
		} else {
			yield* Effect.logDebug(
				`No threads found, skipping lastIndexedSnowflake update for forum ${channel.name}`,
			);
		}

		yield* ensureInviteCode(channel, channelSettings);
	});
}

function indexGuild(guild: Guild, guildIndex: number, totalGuilds: number) {
	return Effect.gen(function* () {
		const guildStartTime = yield* Clock.currentTimeMillis;
		yield* Console.log(
			`[${guildIndex + 1}/${totalGuilds}] Starting indexing for guild: ${guild.name} (${guild.id})`,
		);

		yield* syncGuild(guild);

		const channels = Arr.fromIterable(guild.channels.cache.values());

		const indexableChannels = Arr.filter(
			channels,
			(channel) =>
				channel.type === ChannelType.GuildText ||
				channel.type === ChannelType.GuildAnnouncement ||
				channel.type === ChannelType.GuildForum,
		);

		yield* Console.log(
			`[${guildIndex + 1}/${totalGuilds}] ${guild.name}: Found ${indexableChannels.length} indexable channels`,
		);

		const guildId = guild.id;
		let completedChannels = 0;
		const totalChannels = indexableChannels.length;

		yield* Effect.forEach(
			indexableChannels,
			(channel: Channel) =>
				Effect.gen(function* () {
					const channelName = channel.isDMBased() ? channel.id : channel.name;

					if (channel.type === ChannelType.GuildForum) {
						yield* indexForumChannel(channel as ForumChannel, guildId);
					} else if (
						channel.type === ChannelType.GuildText ||
						channel.type === ChannelType.GuildAnnouncement
					) {
						yield* indexTextChannel(
							channel as TextChannel | NewsChannel,
							guildId,
						);
					}

					completedChannels++;
					yield* Effect.logDebug(
						`[${guildIndex + 1}/${totalGuilds}] ${guild.name}: Completed channel ${completedChannels}/${totalChannels} - ${channelName}`,
					);

					yield* Effect.sleep(INDEXING_CONFIG.channelProcessDelay);
				}).pipe(
					Effect.catchAll((error) => {
						completedChannels++;
						const channelId = channel.isDMBased() ? channel.id : channel.name;
						return Console.error(
							`[${guildIndex + 1}/${totalGuilds}] ${guild.name}: Error indexing channel ${channelId}:`,
							error,
						);
					}),
				),
			{ concurrency: 3 },
		);

		const guildEndTime = yield* Clock.currentTimeMillis;
		const guildDuration = guildEndTime - guildStartTime;
		const guildSeconds = Math.floor(guildDuration / 1000);
		const guildMinutes = Math.floor(guildSeconds / 60);
		const remainingSeconds = guildSeconds % 60;

		yield* Console.log(
			`[${guildIndex + 1}/${totalGuilds}] Completed indexing for guild: ${guild.name} (${totalChannels} channels in ${guildMinutes}m ${remainingSeconds}s)`,
		);
	});
}

function runIndexing() {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const startTime = yield* Clock.currentTimeMillis;
		yield* Console.log("=== Starting indexing run ===");

		const guilds = yield* discord.getGuilds();
		const totalGuilds = guilds.length;
		yield* Console.log(`Found ${totalGuilds} guilds to index`);

		yield* Effect.forEach(
			Arr.map(guilds, (guild, index) => ({ guild, index })),
			({ guild, index }) =>
				Effect.gen(function* () {
					yield* indexGuild(guild, index, totalGuilds);
				}).pipe(
					Effect.catchAll((error) =>
						Console.error(
							`[${index + 1}/${totalGuilds}] Error indexing guild ${guild.name}:`,
							error,
						),
					),
				),
			{ concurrency: 2 },
		);

		const endTime = yield* Clock.currentTimeMillis;
		const duration = endTime - startTime;
		const hours = Math.floor(duration / 1000 / 60 / 60);
		const minutes = Math.floor((duration / 1000 / 60) % 60);
		const seconds = Math.floor((duration / 1000) % 60);

		yield* Console.log(
			`=== Indexing complete - ${totalGuilds} guilds indexed in ${hours}h ${minutes}m ${seconds}s ===`,
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

export const IndexingHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("clientReady", () =>
			Effect.gen(function* () {
				yield* Console.log("Starting indexing loop...");
				yield* startIndexingLoop(true).pipe(
					Effect.tap(() => Console.log("Indexing loop started")),
					Effect.catchAllCause((cause) =>
						Console.error("Error starting indexing loop:", cause),
					),
				);
			}),
		);
	}),
);
