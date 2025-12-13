import { Database } from "@packages/database/database";
import {
	getSnowflakeFromDurationAgo,
	wasRecentlyUpdated,
} from "@packages/database-utils/snowflakes";
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
	Option,
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

const INDEXING_CONFIG = {
	scheduleInterval: Duration.hours(6),
	maxMessagesPerChannel: 10000,
	messagesPerPage: 100,
	channelProcessDelay: Duration.millis(100),
	guildProcessDelay: Duration.millis(500),
	convexBatchSize: 500,
	maxThreadsToCollect: 5000,
	recentUpdateThreshold: Duration.hours(6),
	lookbackPeriod: Duration.weeks(2),
} as const;

function canBotViewChannel(channel: GuildChannel): boolean {
	const permissions = channel.permissionsFor(channel.client.user);
	if (!permissions) return false;
	return permissions.has([
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.ReadMessageHistory,
	]);
}

function isIndexableMessage(message: Message): boolean {
	return !message.system;
}

function getEffectiveStartSnowflake(
	rawLastIndexedSnowflake: bigint | null | undefined,
): bigint {
	const lookbackSnowflake = getSnowflakeFromDurationAgo(
		INDEXING_CONFIG.lookbackPeriod,
	);
	if (
		rawLastIndexedSnowflake === null ||
		rawLastIndexedSnowflake === undefined ||
		rawLastIndexedSnowflake < lookbackSnowflake
	) {
		return lookbackSnowflake;
	}
	return rawLastIndexedSnowflake;
}

function shouldSkipIndexing(
	rawLastIndexedSnowflake: bigint | null | undefined,
): boolean {
	return wasRecentlyUpdated(
		rawLastIndexedSnowflake,
		INDEXING_CONFIG.recentUpdateThreshold,
	);
}

const sortMessagesByIdAsc = Order.mapInput(BigIntEffect.Order, (msg: Message) =>
	BigInt(msg.id),
);

const sortMessagesByIdDesc = Order.reverse(sortMessagesByIdAsc);

function formatDurationMs(ms: number): string {
	const hours = Math.floor(ms / 1000 / 60 / 60);
	const minutes = Math.floor((ms / 1000 / 60) % 60);
	const seconds = Math.floor((ms / 1000) % 60);

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}
	return `${minutes}m ${seconds}s`;
}

const sortThreadsByIdAsc = Order.mapInput(
	BigIntEffect.Order,
	(thread: AnyThreadChannel) => BigInt(thread.id),
);

const sortThreadsByIdDesc = Order.reverse(sortThreadsByIdAsc);

function updateLastIndexedSnowflake(
	channelId: string,
	newSnowflake: bigint,
	currentSnowflake: bigint | null | undefined,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (currentSnowflake && newSnowflake <= currentSnowflake) {
			yield* Console.error(
				`Refusing to update lastIndexedSnowflake for channel ${channelId}: new value ${newSnowflake} is not greater than current value ${currentSnowflake}`,
			);
			return;
		}

		yield* Effect.logDebug(
			`Updating lastIndexedSnowflake for channel ${channelId} to ${newSnowflake}`,
		);

		yield* database.private.channels.updateChannelSettings({
			channelId: BigInt(channelId),
			settings: {
				lastIndexedSnowflake: newSnowflake,
			},
		});

		yield* Effect.logDebug(
			`Successfully updated lastIndexedSnowflake for channel ${channelId}`,
		);
	});
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
				sortMessagesByIdAsc,
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

function fetchForumThreads(
	forumChannelId: string,
	forumChannelName: string,
	threadCutoffId?: bigint,
) {
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

			const fetchedThreads = Arr.fromIterable(archivedThreads.threads.values());
			threads.push(...fetchedThreads);

			const lastThread = archivedThreads.threads.last();

			const isLastThreadOlderThanCutoff =
				lastThread && threadCutoffId && BigInt(lastThread.id) < threadCutoffId;

			if (
				!archivedThreads.hasMore ||
				archivedThreads.threads.size === 0 ||
				isLastThreadOlderThanCutoff
			) {
				hasMoreArchived = false;
			} else {
				beforeId = lastThread?.id;
			}
		}

		const limitedThreads = threads.slice(
			0,
			INDEXING_CONFIG.maxThreadsToCollect,
		);

		yield* Effect.logDebug(
			`Found ${threads.length} threads in forum ${forumChannelName} (${forumChannelId}), limited to ${limitedThreads.length}`,
		);
		return limitedThreads;
	});
}

function storeMessages(
	messages: Message[],
	discordServerId: string,
	channelId: string,
	currentLastIndexedSnowflake?: bigint | null,
) {
	return Effect.gen(function* () {
		if (messages.length === 0) {
			yield* Effect.logDebug(`No messages to store for channel ${channelId}`);
			return;
		}

		const indexableMessages = Arr.filter(messages, isIndexableMessage);

		yield* Effect.logDebug(
			`Storing ${indexableMessages.length} indexable messages (filtered from ${messages.length} total)`,
		);

		const aoMessages = yield* Effect.forEach(
			indexableMessages,
			(msg) =>
				Effect.tryPromise(() => toAOMessage(msg, discordServerId)).pipe(
					Effect.catchAll((error) =>
						Console.warn(`Failed to convert message ${msg.id}:`, error).pipe(
							Effect.as(null),
						),
					),
				),
			{ concurrency: "unbounded" },
		).pipe(Effect.map(Arr.filter(Predicate.isNotNull)));

		yield* upsertAuthors(indexableMessages);
		yield* upsertBotSettings(indexableMessages, discordServerId);
		yield* upsertMessages(aoMessages, channelId);
		yield* uploadMedia(indexableMessages, channelId);

		const latestMessage = Arr.sort(indexableMessages, sortMessagesByIdDesc)[0];
		if (latestMessage) {
			yield* updateLastIndexedSnowflake(
				channelId,
				BigInt(latestMessage.id),
				currentLastIndexedSnowflake,
			);
		}

		yield* Effect.logDebug(`Successfully stored ${aoMessages.length} messages`);
	});
}

function upsertAuthors(messages: Message[]) {
	return Effect.gen(function* () {
		const database = yield* Database;

		const uniqueAuthors = Arr.fromIterable(
			HashMap.values(
				HashMap.fromIterable(
					Arr.map(
						messages,
						(msg) => [msg.author.id, toAODiscordAccount(msg.author)] as const,
					),
				),
			),
		);

		if (uniqueAuthors.length === 0) return;

		yield* Effect.forEach(
			Arr.chunksOf(uniqueAuthors, INDEXING_CONFIG.convexBatchSize),
			(chunk) =>
				database.private.discord_accounts.upsertManyDiscordAccounts({
					accounts: chunk,
				}),
			{ concurrency: 3 },
		);
	});
}

function upsertBotSettings(messages: Message[], discordServerId: string) {
	return Effect.gen(function* () {
		const database = yield* Database;

		const botMessages = Arr.filter(messages, (msg) => msg.author.bot);
		if (botMessages.length === 0) return;

		const uniqueBotIds = Arr.dedupe(
			Arr.map(botMessages, (msg) => msg.author.id),
		);

		const existingSettings = yield* Effect.forEach(
			Arr.chunksOf(uniqueBotIds, INDEXING_CONFIG.convexBatchSize),
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
			const existing = Option.getOrNull(
				HashMap.get(existingSettingsMap, BigInt(botId)),
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

		yield* Effect.forEach(
			Arr.chunksOf(botSettings, INDEXING_CONFIG.convexBatchSize),
			(chunk) =>
				database.private.user_server_settings.upsertManyBotUserServerSettings({
					settings: chunk,
				}),
			{ concurrency: 1 },
		);
	});
}

function upsertMessages(
	aoMessages: Awaited<ReturnType<typeof toAOMessage>>[],
	channelId: string,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		yield* Effect.forEach(
			Arr.chunksOf(
				Arr.map(aoMessages, toUpsertMessageArgs),
				INDEXING_CONFIG.convexBatchSize,
			),
			(chunk) =>
				database.private.messages.upsertManyMessages({
					messages: chunk,
					ignoreChecks: false,
				}),
			{ concurrency: 1 },
		);

		yield* Effect.logDebug(
			`Upserted ${aoMessages.length} messages for channel ${channelId}`,
		);
	});
}

function uploadMedia(messages: Message[], channelId: string) {
	return Effect.gen(function* () {
		const allAttachments = Arr.flatMap(messages, (msg) =>
			Arr.map(Arr.fromIterable(msg.attachments.values()), (att) => ({
				id: att.id,
				url: att.url,
				filename: att.name ?? "",
				contentType: att.contentType ?? undefined,
			})),
		);

		if (allAttachments.length > 0) {
			yield* uploadAttachmentsInBatches(allAttachments);
		}

		const allEmbedImages = Arr.flatMap(messages, extractEmbedImagesToUpload);

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
	});
}

function getChannelSettingsForIndexing(channel: GuildChannel) {
	return Effect.gen(function* () {
		const database = yield* Database;

		if (!canBotViewChannel(channel)) {
			yield* Effect.logDebug(
				`Bot cannot view channel ${channel.name} (${channel.id}), skipping`,
			);
			return null;
		}

		const channelSettings =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(channel.id),
			});

		if (!channelSettings?.flags.indexingEnabled) {
			return null;
		}

		const rawLastIndexedSnowflake = channelSettings.flags.lastIndexedSnowflake;
		if (shouldSkipIndexing(rawLastIndexedSnowflake)) {
			yield* Effect.logDebug(
				`Last indexed snowflake is recent, skipping indexing for ${channel.name} (${channel.id})`,
			);
			return null;
		}

		return channelSettings;
	});
}

function indexThread(
	thread: AnyThreadChannel,
	discordServerId: string,
	lastIndexedSnowflake?: bigint | null,
) {
	return Effect.gen(function* () {
		yield* syncChannel(thread);

		const threadMessages = yield* fetchChannelMessages(
			thread.id,
			thread.name,
			lastIndexedSnowflake?.toString() ?? undefined,
		);
		yield* storeMessages(
			threadMessages,
			discordServerId,
			thread.id,
			lastIndexedSnowflake,
		);
	});
}

function extractThreadsFromMessages(messages: Message[]) {
	return Arr.sort(
		Arr.filter(
			Arr.filter(
				Arr.map(messages, (msg) => msg.thread),
				Predicate.isNotNull,
			),
			(thread): thread is AnyThreadChannel =>
				thread.type === ChannelType.PublicThread ||
				thread.type === ChannelType.AnnouncementThread,
		),
		sortThreadsByIdAsc,
	);
}

function indexTextChannel(
	channel: TextChannel | NewsChannel,
	discordServerId: string,
) {
	return Effect.gen(function* () {
		const database = yield* Database;

		const channelSettings = yield* getChannelSettingsForIndexing(channel);
		if (!channelSettings) return;

		const lastIndexedSnowflake = getEffectiveStartSnowflake(
			channelSettings.flags.lastIndexedSnowflake,
		);

		yield* Effect.logDebug(
			`Indexing text channel ${channel.name} (${channel.id}) - lastIndexedSnowflake: ${lastIndexedSnowflake}`,
		);

		const messages = yield* fetchChannelMessages(
			channel.id,
			channel.name,
			lastIndexedSnowflake.toString(),
		);

		yield* storeMessages(
			messages,
			discordServerId,
			channel.id,
			lastIndexedSnowflake,
		);

		const threadsToIndex = extractThreadsFromMessages(messages);

		if (threadsToIndex.length > 0) {
			yield* Effect.logDebug(
				`Found ${threadsToIndex.length} threads to index in channel ${channel.name}`,
			);

			yield* Effect.forEach(
				threadsToIndex,
				(thread) =>
					Effect.gen(function* () {
						const threadChannel =
							yield* database.private.channels.findChannelByDiscordId({
								discordId: BigInt(thread.id),
							});
						yield* indexThread(
							thread,
							discordServerId,
							threadChannel?.flags?.lastIndexedSnowflake,
						);
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

function fetchThreadChannelMap(threads: AnyThreadChannel[]) {
	return Effect.gen(function* () {
		const database = yield* Database;

		const threadIds = Arr.map(threads, (t) => BigInt(t.id));
		const threadChannels = yield* Effect.forEach(
			Arr.chunksOf(threadIds, INDEXING_CONFIG.convexBatchSize),
			(chunk) =>
				database.private.channels.findChannelsByDiscordIds({
					discordIds: chunk,
				}),
			{ concurrency: 1 },
		).pipe(Effect.map(Arr.flatten));

		return HashMap.fromIterable(
			Arr.map(threadChannels, (c) => [c.id, c] as const),
		);
	});
}

function filterOutOfDateThreads(
	threads: AnyThreadChannel[],
	threadChannelMap: HashMap.HashMap<
		bigint,
		{ flags?: { lastIndexedSnowflake?: bigint | null } }
	>,
	lastIndexedSnowflake: bigint,
) {
	const newThreads = Arr.filter(
		threads,
		(thread) => BigInt(thread.id) > lastIndexedSnowflake,
	);

	const outOfDateThreads = Arr.filter(threads, (thread) => {
		const threadChannel = Option.getOrNull(
			HashMap.get(threadChannelMap, BigInt(thread.id)),
		);
		const threadLastIndexedSnowflake =
			threadChannel?.flags?.lastIndexedSnowflake;

		if (!threadLastIndexedSnowflake) return true;

		const discordLastMessageId = thread.lastMessageId ?? thread.id;
		return BigInt(discordLastMessageId) > threadLastIndexedSnowflake;
	});

	return {
		newThreads,
		outOfDateThreads,
		threadsToIndex: Arr.sort(
			Arr.dedupe([...newThreads, ...outOfDateThreads]),
			sortThreadsByIdAsc,
		),
	};
}

function indexForumChannel(channel: ForumChannel, discordServerId: string) {
	return Effect.gen(function* () {
		const channelSettings = yield* getChannelSettingsForIndexing(channel);
		if (!channelSettings) return;

		const lastIndexedSnowflake = getEffectiveStartSnowflake(
			channelSettings.flags.lastIndexedSnowflake,
		);

		yield* Effect.logDebug(
			`Indexing forum ${channel.name} (${channel.id}) - lastIndexedSnowflake: ${lastIndexedSnowflake}`,
		);

		const threads = yield* fetchForumThreads(
			channel.id,
			channel.name,
			lastIndexedSnowflake,
		);

		const threadChannelMap = yield* fetchThreadChannelMap(threads);
		const { newThreads, outOfDateThreads, threadsToIndex } =
			filterOutOfDateThreads(threads, threadChannelMap, lastIndexedSnowflake);

		yield* Effect.logDebug(
			`Found ${threads.length} total threads, ${newThreads.length} new, ${outOfDateThreads.length} outdated`,
		);

		if (threadsToIndex.length > 0) {
			yield* Console.log(
				`Forum ${channel.name}: Indexing ${threadsToIndex.length} threads`,
			);
		}

		let completedThreads = 0;
		const totalThreadsToIndex = threadsToIndex.length;

		yield* Effect.forEach(
			threadsToIndex,
			(thread) =>
				Effect.gen(function* () {
					const threadChannel = Option.getOrNull(
						HashMap.get(threadChannelMap, BigInt(thread.id)),
					);
					yield* indexThread(
						thread,
						discordServerId,
						threadChannel?.flags?.lastIndexedSnowflake,
					);

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

		const latestThread = Arr.sort(threads, sortThreadsByIdDesc)[0];
		if (latestThread) {
			yield* updateLastIndexedSnowflake(
				channel.id,
				BigInt(latestThread.id),
				channelSettings.flags.lastIndexedSnowflake,
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

		yield* Console.log(
			`[${guildIndex + 1}/${totalGuilds}] Completed indexing for guild: ${guild.name} (${totalChannels} channels in ${formatDurationMs(guildDuration)})`,
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
			Arr.map(guilds, (guild, index) => ({ guild, index })).slice(302),
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

		yield* Console.log(
			`=== Indexing complete - ${totalGuilds} guilds indexed in ${formatDurationMs(duration)} ===`,
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
