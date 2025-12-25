import { expect, it } from "@effect/vitest";
import { Database } from "@packages/database/database";
import type { GuildBasedChannel, Message } from "discord.js";
import { ChannelType, type Guild, MessageType } from "discord.js";
import { Effect, Either } from "effect";
import { describe } from "vitest";
import { DiscordClientMock } from "../core/discord-client-mock";
import { TestLayer } from "../core/layers";
import { syncChannel } from "../sync/channel";
import {
	AutoThreadError,
	AutoThreadErrorCode,
	handleAutoThread,
} from "./auto-thread";

const setupTestChannel = (
	autoThreadEnabled = true,
	channelFactory?: (
		guild: Guild,
		utilities: Effect.Effect.Success<typeof DiscordClientMock>["utilities"],
	) => GuildBasedChannel,
) =>
	Effect.gen(function* () {
		const database = yield* Database;
		const discordMock = yield* DiscordClientMock;
		const guild = discordMock.utilities.createMockGuild();
		discordMock.utilities.seedGuild(guild);
		const channel = channelFactory
			? channelFactory(guild, discordMock.utilities)
			: discordMock.utilities.createMockTextChannel(guild);
		discordMock.utilities.seedChannel(channel);
		yield* database.private.servers.upsertServer({
			name: guild.name,
			discordId: BigInt(guild.id),
			approximateMemberCount: 0,
		});
		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(guild.id),
			},
		);
		if (!serverLiveData?._id) {
			throw new Error("Server not found");
		}
		yield* syncChannel(channel);
		yield* database.private.channels.updateChannelSettings({
			channelId: BigInt(channel.id),
			settings: {
				autoThreadEnabled,
			},
		});
		return { guild, channel, discordMock };
	});

const expectAutoThreadError = (
	result: Either.Either<unknown, unknown>,
	expectedError: AutoThreadError,
) => {
	expect(Either.isLeft(result)).toBe(true);
	if (Either.isLeft(result)) {
		const error = result.left;
		expect(error).toBeInstanceOf(AutoThreadError);
		if (error instanceof AutoThreadError) {
			expect(error._tag).toBe(expectedError._tag);
			expect(error.code).toBe(expectedError.code);
			expect(error.message).toBe(expectedError.message);
		}
	}
};

describe("handleAutoThread", () => {
	it.scoped("returns early for DM channel", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const message = discordMock.utilities.createMockMessage(channel, {
				channelOverride: {
					id: channel.id,
					type: ChannelType.DM,
					isDMBased: () => true,
					isVoiceBased: () => false,
				} as unknown as Message["channel"],
			});
			const result = yield* handleAutoThread(message).pipe(Effect.either);
			expectAutoThreadError(
				result,
				new AutoThreadError({
					message: "Cannot create thread in DM or voice channel",
					code: AutoThreadErrorCode.DM_OR_VOICE_CHANNEL,
				}),
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for voice channel", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const message = discordMock.utilities.createMockMessage(channel, {
				channelOverride: {
					id: channel.id,
					type: ChannelType.GuildVoice,
					isDMBased: () => false,
					isVoiceBased: () => true,
				} as unknown as Message["channel"],
			});
			const result = yield* handleAutoThread(message).pipe(Effect.either);
			expectAutoThreadError(
				result,
				new AutoThreadError({
					message: "Cannot create thread in DM or voice channel",
					code: AutoThreadErrorCode.DM_OR_VOICE_CHANNEL,
				}),
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for unsupported channel type", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const message = discordMock.utilities.createMockMessage(channel, {
				channelOverride: {
					id: channel.id,
					type: ChannelType.GuildForum,
					isDMBased: () => false,
					isVoiceBased: () => false,
				} as unknown as Message["channel"],
			});
			const result = yield* handleAutoThread(message).pipe(Effect.either);
			expectAutoThreadError(
				result,
				new AutoThreadError({
					message: `Channel type ${ChannelType.GuildForum} is not allowed for auto threads`,
					code: AutoThreadErrorCode.INVALID_CHANNEL_TYPE,
				}),
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for bot message", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const message = discordMock.utilities.createMockMessage(channel, {
				authorId: "bot123",
				authorBot: true,
				authorSystem: false,
				authorDisplayName: "BotUser",
			});
			const result = yield* handleAutoThread(message).pipe(Effect.either);
			expectAutoThreadError(
				result,
				new AutoThreadError({
					message: "Message is not from a human user",
					code: AutoThreadErrorCode.NOT_HUMAN_MESSAGE,
				}),
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for non-default message type", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const message = discordMock.utilities.createMockMessage(channel, {
				type: MessageType.Reply,
			});
			const result = yield* handleAutoThread(message).pipe(Effect.either);
			expectAutoThreadError(
				result,
				new AutoThreadError({
					message: `Message type ${MessageType.Reply} is not supported`,
					code: AutoThreadErrorCode.INVALID_MESSAGE_TYPE,
				}),
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early when message already has a thread", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const message = discordMock.utilities.createMockMessage(channel, {
				thread: {
					id: "existing-thread",
				} as unknown as Message["thread"],
			});
			const result = yield* handleAutoThread(message).pipe(Effect.either);
			expectAutoThreadError(
				result,
				new AutoThreadError({
					message: "Message is already in a thread",
					code: AutoThreadErrorCode.ALREADY_IN_THREAD,
				}),
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early when auto-thread is disabled", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel(false);
			const message = discordMock.utilities.createMockMessage(channel);
			const result = yield* handleAutoThread(message).pipe(Effect.either);
			expectAutoThreadError(
				result,
				new AutoThreadError({
					message: "Auto thread is disabled for this channel",
					code: AutoThreadErrorCode.AUTO_THREAD_DISABLED,
				}),
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("creates thread when all conditions are met", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const threadHelper = discordMock.utilities.createThreadTrackingHelper();
			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "Hello world",
				content: "Hello world",
				startThread: threadHelper.wrappedStartThread,
			});
			yield* handleAutoThread(message);
			expect(threadHelper.threadCreated()).toBe(true);
			expect(threadHelper.threadName()).toBe("TestUser - Hello world");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses nickname when available", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const threadHelper = discordMock.utilities.createThreadTrackingHelper();
			const message = discordMock.utilities.createMockMessage(channel, {
				memberNickname: "CoolNickname",
				cleanContent: "Test message",
				startThread: threadHelper.wrappedStartThread,
			});
			yield* handleAutoThread(message);
			expect(threadHelper.threadName()).toBe("CoolNickname - Test message");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("removes Discord markdown from thread title", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const threadHelper = discordMock.utilities.createThreadTrackingHelper();
			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "*bold* _italic_ ~strike~ `code`",
				content: "*bold* _italic_ ~strike~ `code`",
				startThread: threadHelper.wrappedStartThread,
			});
			yield* handleAutoThread(message);
			expect(threadHelper.threadName()).toBe(
				"TestUser - bold italic strike code",
			);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("truncates long thread titles", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const threadHelper = discordMock.utilities.createThreadTrackingHelper();
			const longContent = "a".repeat(100);
			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: longContent,
				content: longContent,
				startThread: threadHelper.wrappedStartThread,
			});
			yield* handleAutoThread(message);
			const threadName = threadHelper.threadName();
			expect(threadName.length).toBeLessThanOrEqual(50);
			expect(threadName).toContain("...");
			expect(threadName.startsWith("TestUser -")).toBe(true);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses attachment name when message has no content", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const threadHelper = discordMock.utilities.createThreadTrackingHelper();
			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "",
				content: "",
				attachmentsSize: 1,
				attachmentName: "document.pdf",
				startThread: threadHelper.wrappedStartThread,
			});
			yield* handleAutoThread(message);
			expect(threadHelper.threadName()).toBe("TestUser - document.pdf");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses 'Attachment' fallback when attachment has no name", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel();
			const threadHelper = discordMock.utilities.createThreadTrackingHelper();
			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "",
				content: "",
				attachmentsSize: 1,
				attachmentName: null,
				startThread: threadHelper.wrappedStartThread,
			});
			yield* handleAutoThread(message);
			expect(threadHelper.threadName()).toBe("TestUser - Attachment");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("works with GuildAnnouncement channel type", () =>
		Effect.gen(function* () {
			const { channel, discordMock } = yield* setupTestChannel(
				true,
				(guild, utilities) => utilities.createMockNewsChannel(guild),
			);
			const threadHelper = discordMock.utilities.createThreadTrackingHelper();
			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "Announcement message",
				startThread: threadHelper.wrappedStartThread,
			});
			yield* handleAutoThread(message);
			expect(threadHelper.threadCreated()).toBe(true);
		}).pipe(Effect.provide(TestLayer)),
	);
});
