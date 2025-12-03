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
import { ChannelType, PermissionFlagsBits } from "discord.js";
import {
	Array as Arr,
	BigInt as BigIntEffect,
	Cause,
	Clock,
	Data,
	Duration,
	Effect,
	Layer,
	Option,
	Order,
	pipe,
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
import { isHumanMessage } from "../utils/message-utils";

class IndexingError extends Data.TaggedError("IndexingError")<{
	readonly operation: string;
	readonly context: string;
	readonly cause?: unknown;
}> {}

const IndexingConfig = {
	scheduleInterval: Duration.hours(6),
	maxMessagesPerChannel: 10000,
	messagesPerPage: 100,
	channelProcessDelay: Duration.millis(100),
	guildProcessDelay: Duration.millis(500),
	threadConcurrency: 3,
	channelConcurrency: 2,
	messageConcurrency: 5,
	authorConcurrency: 10,
} as const;

const bySnowflakeAsc = Order.mapInput(BigIntEffect.Order, (msg: Message) =>
	BigInt(msg.id),
);

const byThreadSnowflakeDesc = Order.reverse(
	Order.mapInput(BigIntEffect.Order, (thread: AnyThreadChannel) =>
		BigInt(thread.id),
	),
);

const isIndexableThread = (
	thread: AnyThreadChannel | null | undefined,
): thread is AnyThreadChannel =>
	thread !== null &&
	thread !== undefined &&
	(thread.type === ChannelType.PublicThread ||
		thread.type === ChannelType.AnnouncementThread);

const isIndexableChannel = (channel: Channel) =>
	channel.type === ChannelType.GuildText ||
	channel.type === ChannelType.GuildAnnouncement ||
	channel.type === ChannelType.GuildForum;

const ensureInviteCode = (
	channel: TextChannel | NewsChannel | ForumChannel,
	currentInviteCode: string | undefined,
) =>
	Effect.gen(function* () {
		if (currentInviteCode) {
			return Option.some(currentInviteCode);
		}

		const canMakeInvites = channel
			.permissionsFor(channel.client.user)
			?.has(PermissionFlagsBits.CreateInstantInvite);
		const vanityURLCode = channel.guild.vanityURLCode;

		if (!canMakeInvites && !vanityURLCode) {
			yield* Effect.logDebug(
				`Cannot create invite for channel ${channel.name} - no permissions and no vanity URL`,
			);
			return Option.none();
		}

		const database = yield* Database;

		const inviteCode = yield* pipe(
			Effect.tryPromise({
				try: async () => {
					if (canMakeInvites) {
						const invite = await channel.createInvite({
							maxAge: 0,
							maxUses: 0,
							reason: "Channel indexing enabled invite",
							unique: false,
							temporary: false,
						});
						return invite.code;
					}
					return vanityURLCode ?? undefined;
				},
				catch: (error) =>
					new IndexingError({
						operation: "createInvite",
						context: `channel ${channel.name}`,
						cause: error,
					}),
			}),
			Effect.tapError((error) =>
				Effect.logWarning(`Failed to create invite: ${error.context}`),
			),
			Effect.orElseSucceed(() => vanityURLCode ?? undefined),
		);

		if (inviteCode) {
			yield* database.private.channels.updateChannelSettings({
				channelId: BigInt(channel.id),
				settings: { inviteCode },
			});
			yield* Effect.logDebug(
				`Created invite code ${inviteCode} for channel ${channel.name}`,
			);
		}

		return Option.fromNullable(inviteCode);
	});

type FetchState = {
	messages: Message[];
	lastId: string;
	hasMore: boolean;
};

const fetchChannelMessages = (
	channelId: string,
	channelName: string,
	startFromId?: string,
) =>
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* Effect.logDebug(
			startFromId
				? `Fetching messages for ${channelName} (${channelId}) starting after ${startFromId}`
				: `Fetching messages for ${channelName} (${channelId}) from beginning`,
		);

		const initialState: FetchState = {
			messages: [],
			lastId: startFromId ?? "0",
			hasMore: true,
		};

		const finalState = yield* Effect.iterate(initialState, {
			while: (state) =>
				state.hasMore &&
				state.messages.length < IndexingConfig.maxMessagesPerChannel,
			body: (state) =>
				Effect.gen(function* () {
					const fetchAfter = state.lastId === "0" ? undefined : state.lastId;

					const fetched = yield* discord.fetchChannelMessages(channelId, {
						limit: IndexingConfig.messagesPerPage,
						after: fetchAfter,
					});

					if (fetched.size === 0) {
						return { ...state, hasMore: false };
					}

					const sorted = Arr.sort(
						Arr.fromIterable(fetched.values()),
						bySnowflakeAsc,
					);

					const lastMsg = Arr.last(sorted);
					const newLastId = Option.isSome(lastMsg)
						? lastMsg.value.id
						: state.lastId;
					const shouldContinue =
						fetched.size >= IndexingConfig.messagesPerPage &&
						newLastId !== state.lastId;

					return {
						messages: [...state.messages, ...sorted],
						lastId: newLastId,
						hasMore: shouldContinue,
					};
				}),
		});

		yield* Effect.logDebug(
			`Fetched ${finalState.messages.length} messages from ${channelName}`,
		);

		return finalState.messages;
	});

type ArchivedThreadState = {
	threads: AnyThreadChannel[];
	beforeId: string | undefined;
	hasMore: boolean;
};

const fetchForumThreads = (forumChannelId: string, forumChannelName: string) =>
	Effect.gen(function* () {
		const discord = yield* Discord;

		const activeThreads = yield* discord.fetchActiveThreads(forumChannelId);
		const active = Arr.fromIterable(activeThreads.threads.values());

		const initialState: ArchivedThreadState = {
			threads: [],
			beforeId: undefined,
			hasMore: true,
		};

		const archivedState = yield* Effect.iterate(initialState, {
			while: (state) => state.hasMore,
			body: (state) =>
				Effect.gen(function* () {
					const fetched = yield* discord.fetchArchivedThreads(forumChannelId, {
						before: state.beforeId,
					});

					const threads = Arr.fromIterable(fetched.threads.values());
					const lastThread = fetched.threads.last();

					return {
						threads: [...state.threads, ...threads],
						beforeId: lastThread?.id,
						hasMore: fetched.hasMore && threads.length > 0,
					};
				}),
		});

		const archived = archivedState.threads;
		const allThreads = [...active, ...archived];

		yield* Effect.logDebug(
			`Found ${allThreads.length} threads in forum ${forumChannelName}`,
		);

		return allThreads;
	});

const convertAndFilterMessages = (
	messages: Message[],
	discordServerId: string,
) =>
	Effect.gen(function* () {
		const humanMessages = Arr.filter(messages, isHumanMessage);

		const converted = yield* Effect.forEach(
			humanMessages,
			(msg) =>
				pipe(
					Effect.tryPromise(() => toAOMessage(msg, discordServerId)),
					Effect.tapError((error) =>
						Effect.logWarning(`Failed to convert message ${msg.id}: ${error}`),
					),
					Effect.option,
				),
			{ concurrency: "unbounded" },
		);

		return {
			humanMessages,
			aoMessages: Arr.filterMap(converted, (opt) => opt),
		};
	});

const upsertAuthors = (humanMessages: Message[]) =>
	Effect.gen(function* () {
		const database = yield* Database;

		const uniqueAuthors = pipe(
			humanMessages,
			Arr.map(
				(msg) => [msg.author.id, toAODiscordAccount(msg.author)] as const,
			),
			(entries) => new Map(entries),
			(map) => Arr.fromIterable(map.values()),
		);

		yield* Effect.forEach(
			uniqueAuthors,
			(author) =>
				database.private.discord_accounts.upsertDiscordAccount({
					account: author,
				}),
			{ concurrency: IndexingConfig.authorConcurrency },
		);
	});

const upsertMessages = (
	aoMessages: Awaited<ReturnType<typeof toAOMessage>>[],
) =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* Effect.forEach(
			aoMessages,
			(data) =>
				pipe(
					database.private.messages.upsertMessage({
						...toUpsertMessageArgs(data),
						ignoreChecks: false,
					}),
					Effect.tapError((error) =>
						Effect.logWarning(`Failed to upsert message: ${error}`),
					),
					Effect.ignore,
				),
			{ concurrency: IndexingConfig.messageConcurrency },
		);
	});

const uploadMediaAssets = (humanMessages: Message[], channelId: string) =>
	Effect.gen(function* () {
		const attachments = Arr.flatMap(humanMessages, (msg) =>
			Arr.map(Arr.fromIterable(msg.attachments.values()), (att) => ({
				id: att.id,
				url: att.url,
				filename: att.name ?? "",
				contentType: att.contentType ?? undefined,
			})),
		);

		if (attachments.length > 0) {
			yield* uploadAttachmentsInBatches(attachments);
		}

		const embedImages = Arr.flatMap(humanMessages, extractEmbedImagesToUpload);

		if (embedImages.length > 0) {
			yield* pipe(
				uploadEmbedImagesInBatches(embedImages),
				Effect.tapError((error) =>
					Effect.logWarning(
						`Failed to upload embed images for channel ${channelId}: ${error}`,
					),
				),
				Effect.ignore,
			);
		}
	});

const updateLastIndexedSnowflake = (channelId: string, lastMessageId: string) =>
	Effect.gen(function* () {
		const database = yield* Database;

		const channel = yield* database.private.channels.findChannelByDiscordId({
			discordId: BigInt(channelId),
		});

		if (!channel) {
			yield* Effect.logWarning(
				`Could not update lastIndexedSnowflake - channel ${channelId} not found`,
			);
			return;
		}

		const oldValue = channel.flags?.lastIndexedSnowflake;
		const newValue = BigInt(lastMessageId);

		yield* Effect.logDebug(
			`Updating lastIndexedSnowflake for ${channelId}: ${oldValue ?? "null"} -> ${newValue}`,
		);

		yield* database.private.channels.updateChannelSettings({
			channelId: BigInt(channelId),
			settings: { lastIndexedSnowflake: newValue },
		});
	});

const storeMessages = (
	messages: Message[],
	discordServerId: string,
	channelId: string,
) =>
	Effect.gen(function* () {
		if (messages.length === 0) {
			yield* Effect.logDebug(`No messages to store for channel ${channelId}`);
			return;
		}

		const { humanMessages, aoMessages } = yield* convertAndFilterMessages(
			messages,
			discordServerId,
		);

		yield* Effect.logDebug(
			`Storing ${humanMessages.length} human messages (${messages.length} total)`,
		);

		yield* Effect.all(
			[upsertAuthors(humanMessages), upsertMessages(aoMessages)],
			{ concurrency: 2 },
		);

		yield* uploadMediaAssets(humanMessages, channelId);

		const lastMessage = Arr.last(humanMessages);
		if (Option.isSome(lastMessage)) {
			yield* updateLastIndexedSnowflake(channelId, lastMessage.value.id);
		}

		yield* Effect.logDebug(`Successfully stored ${aoMessages.length} messages`);
	});

const indexThread = (thread: AnyThreadChannel, discordServerId: string) =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* syncChannel(thread);

		const threadChannel =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(thread.id),
			});

		const lastIndexed = threadChannel?.flags?.lastIndexedSnowflake;

		const messages = yield* fetchChannelMessages(
			thread.id,
			thread.name,
			lastIndexed?.toString(),
		);

		yield* storeMessages(messages, discordServerId, thread.id);
	}).pipe(
		Effect.tapErrorCause((cause) =>
			Effect.logError(
				`Error indexing thread ${thread.name} (${thread.id}): ${Cause.pretty(cause)}`,
			),
		),
		Effect.ignore,
	);

const indexTextChannel = (
	channel: TextChannel | NewsChannel,
	discordServerId: string,
) =>
	Effect.gen(function* () {
		const database = yield* Database;

		const channelData = yield* database.private.channels.findChannelByDiscordId(
			{
				discordId: BigInt(channel.id),
			},
		);

		if (!channelData?.flags.indexingEnabled) {
			return;
		}

		yield* ensureInviteCode(channel, channelData.flags.inviteCode);

		const lastIndexed = channelData.flags.lastIndexedSnowflake;
		yield* Effect.logDebug(
			`Indexing text channel ${channel.name} (${channel.id}) - last: ${lastIndexed ?? "beginning"}`,
		);

		const messages = yield* fetchChannelMessages(
			channel.id,
			channel.name,
			lastIndexed?.toString(),
		);

		if (messages.length > 0) {
			const first = messages[0]?.id;
			const last = messages[messages.length - 1]?.id;
			yield* Effect.logDebug(`Fetched messages range: ${first} to ${last}`);
		}

		yield* storeMessages(messages, discordServerId, channel.id);

		const threads = pipe(
			messages,
			Arr.map((msg) => msg.thread),
			Arr.filter(
				(thread): thread is AnyThreadChannel =>
					thread !== null && thread !== undefined && isIndexableThread(thread),
			),
		);

		if (threads.length > 0) {
			yield* Effect.logDebug(
				`Found ${threads.length} threads to index in ${channel.name}`,
			);

			yield* Effect.forEach(
				threads,
				(thread) => indexThread(thread, discordServerId),
				{ concurrency: IndexingConfig.threadConcurrency },
			);
		}
	});

const indexForumChannel = (channel: ForumChannel, discordServerId: string) =>
	Effect.gen(function* () {
		const database = yield* Database;

		const channelData = yield* database.private.channels.findChannelByDiscordId(
			{
				discordId: BigInt(channel.id),
			},
		);

		if (!channelData?.flags.indexingEnabled) {
			return;
		}

		yield* ensureInviteCode(channel, channelData.flags.inviteCode);

		const lastIndexed = channelData.flags.lastIndexedSnowflake;
		yield* Effect.logDebug(
			`Indexing forum ${channel.name} (${channel.id}) - last: ${lastIndexed ?? "null"}`,
		);

		const allThreads = yield* fetchForumThreads(channel.id, channel.name);

		const threadsToIndex = lastIndexed
			? Arr.filter(allThreads, (t) => BigInt(t.id) > lastIndexed)
			: allThreads;

		yield* Effect.logDebug(
			`${allThreads.length} total, ${threadsToIndex.length} new threads to index`,
		);

		yield* Effect.forEach(
			threadsToIndex,
			(thread) =>
				pipe(
					indexThread(thread, discordServerId),
					Effect.zipRight(Effect.sleep(IndexingConfig.channelProcessDelay)),
				),
			{ concurrency: 2 },
		);

		if (allThreads.length > 0) {
			const sorted = Arr.sort(allThreads, byThreadSnowflakeDesc);
			const latest = Arr.head(sorted);

			if (Option.isSome(latest)) {
				yield* updateLastIndexedSnowflake(channel.id, latest.value.id);
			}
		}
	});

const indexGuild = (guild: Guild) =>
	Effect.gen(function* () {
		yield* Effect.logInfo(
			`Starting indexing for guild: ${guild.name} (${guild.id})`,
		);

		const database = yield* Database;

		const server = yield* database.private.servers.getServerByDiscordId({
			discordId: BigInt(guild.id),
		});

		if (!server) {
			yield* Effect.logWarning(
				`Server ${guild.id} not found in database, skipping`,
			);
			return;
		}

		const channels = pipe(
			Arr.fromIterable(guild.channels.cache.values()),
			Arr.filter(isIndexableChannel),
		);

		yield* Effect.logDebug(
			`Found ${channels.length} indexable channels in ${guild.name}`,
		);

		yield* Effect.forEach(
			channels,
			(channel: Channel) =>
				pipe(
					channel.type === ChannelType.GuildForum
						? indexForumChannel(
								channel as ForumChannel,
								server.discordId.toString(),
							)
						: indexTextChannel(
								channel as TextChannel | NewsChannel,
								server.discordId.toString(),
							),
					Effect.zipRight(Effect.sleep(IndexingConfig.channelProcessDelay)),
					Effect.tapErrorCause((cause) => {
						const name = channel.isDMBased()
							? channel.id
							: (channel as TextChannel).name;
						return Effect.logError(
							`Error indexing channel ${name}: ${Cause.pretty(cause)}`,
						);
					}),
					Effect.ignore,
				),
			{ concurrency: IndexingConfig.channelConcurrency },
		);

		yield* Effect.logInfo(`Completed indexing for guild: ${guild.name}`);
	});

const runIndexing = Effect.gen(function* () {
	const discord = yield* Discord;
	const startTime = yield* Clock.currentTimeMillis;

	yield* Effect.logInfo("=== Starting indexing run ===");

	const guilds = yield* discord.getGuilds();
	yield* Effect.logInfo(`Found ${guilds.length} guilds to index`);

	yield* Effect.forEach(
		guilds,
		(guild) =>
			pipe(
				indexGuild(guild),
				Effect.zipRight(Effect.sleep(IndexingConfig.guildProcessDelay)),
				Effect.tapErrorCause((cause) =>
					Effect.logError(
						`Error indexing guild ${guild.name}: ${Cause.pretty(cause)}`,
					),
				),
				Effect.ignore,
			),
		{ concurrency: 1 },
	);

	const endTime = yield* Clock.currentTimeMillis;
	const duration = Duration.millis(endTime - startTime);
	const formatted = Duration.format(duration);

	yield* Effect.logInfo(`=== Indexing complete - took ${formatted} ===`);
});

export const startIndexingLoop = (runImmediately = true) =>
	Effect.gen(function* () {
		yield* Effect.logInfo(
			`Starting indexing loop - will run every ${Duration.format(IndexingConfig.scheduleInterval)}`,
		);

		if (runImmediately) {
			yield* Effect.logDebug("Running initial indexing...");
			yield* pipe(
				runIndexing,
				Effect.tapErrorCause((cause) =>
					Effect.logError(
						`Error during initial indexing: ${Cause.pretty(cause)}`,
					),
				),
				Effect.ignore,
			);
		}

		yield* pipe(
			runIndexing,
			Effect.repeat(Schedule.fixed(IndexingConfig.scheduleInterval)),
			Effect.tapErrorCause((cause) =>
				Effect.logError(`Error in scheduled indexing: ${Cause.pretty(cause)}`),
			),
			Effect.ignore,
			Effect.fork,
		);

		yield* Effect.logInfo("Indexing loop started successfully");
	});

export const IndexingHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("clientReady", () =>
			pipe(
				Effect.logInfo("Starting indexing loop..."),
				Effect.zipRight(startIndexingLoop(true)),
				Effect.tap(() => Effect.logInfo("Indexing loop started")),
				Effect.tapErrorCause((cause) =>
					Effect.logError(
						`Error starting indexing loop: ${Cause.pretty(cause)}`,
					),
				),
				Effect.ignore,
			),
		);
	}),
);
