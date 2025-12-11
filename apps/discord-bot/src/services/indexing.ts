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

		const uniqueAuthors = HashMap.fromIterable(
			Arr.map(
				indexableMessages,
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

		const botMessages = Arr.filter(indexableMessages, (msg) => msg.author.bot);
		if (botMessages.length > 0) {
			const uniqueBotIds = Arr.dedupe(
				Arr.map(botMessages, (msg) => msg.author.id),
			);
			yield* Effect.forEach(
				uniqueBotIds,
				(botId) =>
					Effect.gen(function* () {
						const existingSettings =
							yield* database.private.user_server_settings.findUserServerSettingsById(
								{
									userId: BigInt(botId),
									serverId: BigInt(discordServerId),
								},
							);
						yield* Effect.sleep(Duration.millis(10));

						yield* database.private.user_server_settings.upsertUserServerSettings(
							{
								settings: {
									serverId: BigInt(discordServerId),
									userId: BigInt(botId),
									permissions: existingSettings?.permissions ?? 0,
									canPubliclyDisplayMessages: true,
									messageIndexingDisabled:
										existingSettings?.messageIndexingDisabled ?? false,
									apiCallsUsed: existingSettings?.apiCallsUsed ?? 0,
								},
							},
						);
					}),
				{ concurrency: 5 },
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

		yield* Effect.forEach(
			aoMessages,
			(data) =>
				database.private.messages.upsertMessage({
					...toUpsertMessageArgs(data),
					ignoreChecks: false,
				}),
			{ concurrency: 5 },
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
				const channelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: BigInt(channelId),
					});
				yield* Effect.sleep(Duration.millis(10));
				const currentChannel = channelLiveData;

				if (currentChannel) {
					const oldLastIndexed = currentChannel.flags?.lastIndexedSnowflake;
					const newLastIndexedBigInt = BigInt(lastMessage.id);

					yield* Effect.logDebug(
						`Updating lastIndexedSnowflake for channel ${channelId}: ${oldLastIndexed ?? "null"} -> ${newLastIndexedBigInt}`,
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

		if (!canBotViewChannel(channel)) {
			yield* Effect.logDebug(
				`Bot cannot view channel ${channel.name} (${channel.id}), skipping`,
			);
			return;
		}

		const channelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(channel.id),
			});
		yield* Effect.sleep(Duration.millis(10));
		const channelSettings = channelLiveData;

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

		const channelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(channel.id),
			});
		yield* Effect.sleep(Duration.millis(10));
		const channelSettings = channelLiveData;

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

		const outOfDateThreads = yield* Effect.filter(
			threads,
			(thread) =>
				Effect.gen(function* () {
					const threadChannelLiveData =
						yield* database.private.channels.findChannelByDiscordId({
							discordId: BigInt(thread.id),
						});
					yield* Effect.sleep(Duration.millis(10));
					const threadChannel = threadChannelLiveData;
					const threadLastIndexed = threadChannel?.flags?.lastIndexedSnowflake;

					if (!threadLastIndexed) {
						return true;
					}

					const discordLastMessageId = thread.lastMessageId ?? thread.id;
					return BigInt(discordLastMessageId) > threadLastIndexed;
				}),
			{ concurrency: 10 },
		);

		const threadsToIndex = Arr.dedupe([...newThreads, ...outOfDateThreads]);

		yield* Effect.logDebug(
			`${outOfDateThreads.length} threads have new messages, ${threadsToIndex.length} total threads to index`,
		);

		for (const thread of threadsToIndex) {
			yield* Effect.gen(function* () {
				yield* syncChannel(thread);

				const threadChannelLiveData =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: BigInt(thread.id),
					});
				yield* Effect.sleep(Duration.millis(10));
				const threadChannel = threadChannelLiveData;
				const threadLastIndexed = threadChannel?.flags?.lastIndexedSnowflake;

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
			);
		}

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
						discordId: BigInt(channel.id),
					});
				yield* Effect.sleep(Duration.millis(10));
				const currentChannel = channelLiveData;

				if (currentChannel) {
					const oldLastIndexed = currentChannel.flags?.lastIndexedSnowflake;
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

		yield* ensureInviteCode(channel, channelSettings);
	});
}

function indexGuild(guild: Guild) {
	return Effect.gen(function* () {
		yield* Effect.logDebug(
			`Starting indexing for guild: ${guild.name} (${guild.id})`,
		);

		const database = yield* Database;

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(guild.id),
			},
		);
		yield* Effect.sleep(Duration.millis(10));
		const server = serverLiveData;

		if (!server) {
			yield* Console.warn(`Server ${guild.id} not found in database, skipping`);
			return;
		}

		const channels = Arr.fromIterable(guild.channels.cache.values());

		const indexableChannels = Arr.filter(
			channels,
			(channel) =>
				channel.type === ChannelType.GuildText ||
				channel.type === ChannelType.GuildAnnouncement ||
				channel.type === ChannelType.GuildForum,
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
						const channelId = channel.isDMBased() ? channel.id : channel.name;
						return Console.error(`Error indexing channel ${channelId}:`, error);
					}),
				),
			{ concurrency: 1 },
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
