import { expect, it } from "@effect/vitest";
import { Database } from "@packages/database/database";
import { DatabaseTestLayer } from "@packages/database/database-test";
import type { Message } from "discord.js";
import { ChannelType, MessageType } from "discord.js";
import { Effect, Layer } from "effect";
import { describe } from "vitest";
import { DiscordClientMock } from "../../core/discord-client-mock";
import { DiscordClientTestLayer } from "../../core/discord-client-test-layer";
import { handleAutoThread } from "./auto-thread-handler";

const TestLayer = Layer.mergeAll(DiscordClientTestLayer, DatabaseTestLayer);

describe("handleAutoThread", () => {
	it.scoped("returns early for DM channel", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			const message = discordMock.utilities.createMockMessage(channel, {
				channelOverride: {
					id: channel.id,
					type: ChannelType.DM,
					isDMBased: () => true,
					isVoiceBased: () => false,
				} as unknown as Message["channel"],
			});

			const result = yield* handleAutoThread(message);
			expect(result).toBeUndefined();
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for voice channel", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			const message = discordMock.utilities.createMockMessage(channel, {
				channelOverride: {
					id: channel.id,
					type: ChannelType.GuildVoice,
					isDMBased: () => false,
					isVoiceBased: () => true,
				} as unknown as Message["channel"],
			});

			const result = yield* handleAutoThread(message);
			expect(result).toBeUndefined();
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for unsupported channel type", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			const message = discordMock.utilities.createMockMessage(channel, {
				channelOverride: {
					id: channel.id,
					type: ChannelType.GuildForum,
					isDMBased: () => false,
					isVoiceBased: () => false,
				} as unknown as Message["channel"],
			});

			const result = yield* handleAutoThread(message);
			expect(result).toBeUndefined();
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for bot message", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			const message = discordMock.utilities.createMockMessage(channel, {
				authorId: "bot123",
				authorBot: true,
				authorSystem: false,
				authorDisplayName: "BotUser",
			});

			const result = yield* handleAutoThread(message);
			expect(result).toBeUndefined();
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early for non-default message type", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			const message = discordMock.utilities.createMockMessage(channel, {
				type: MessageType.Reply,
			});

			const result = yield* handleAutoThread(message);
			expect(result).toBeUndefined();
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early when message already has a thread", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			const message = discordMock.utilities.createMockMessage(channel, {
				thread: {
					id: "existing-thread",
				} as unknown as Message["thread"],
			});

			const result = yield* handleAutoThread(message);
			expect(result).toBeUndefined();
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("returns early when auto-thread is disabled", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: false,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			const message = discordMock.utilities.createMockMessage(channel);

			const result = yield* handleAutoThread(message);
			expect(result).toBeUndefined();
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("creates thread when all conditions are met", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			let threadCreated = false;
			let threadName = "";

			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "Hello world",
				content: "Hello world",
				startThread: async (options: { name: string; reason: string }) => {
					threadCreated = true;
					threadName = options.name;
					return {
						id: "thread123",
						name: options.name,
					} as unknown as Message["thread"];
				},
			});

			yield* handleAutoThread(message);

			expect(threadCreated).toBe(true);
			expect(threadName).toBe("TestUser - Hello world");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses nickname when available", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			let threadName = "";

			const message = discordMock.utilities.createMockMessage(channel, {
				memberNickname: "CoolNickname",
				cleanContent: "Test message",
				startThread: async (options: { name: string; reason: string }) => {
					threadName = options.name;
					return {
						id: "thread123",
						name: options.name,
					} as unknown as Message["thread"];
				},
			});

			yield* handleAutoThread(message);

			expect(threadName).toBe("CoolNickname - Test message");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("removes Discord markdown from thread title", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			let threadName = "";

			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "*bold* _italic_ ~strike~ `code`",
				content: "*bold* _italic_ ~strike~ `code`",
				startThread: async (options: { name: string; reason: string }) => {
					threadName = options.name;
					return {
						id: "thread123",
						name: options.name,
					} as unknown as Message["thread"];
				},
			});

			yield* handleAutoThread(message);

			expect(threadName).toBe("TestUser - bold italic strike code");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("truncates long thread titles", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			let threadName = "";

			const longContent = "a".repeat(100);
			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: longContent,
				content: longContent,
				startThread: async (options: { name: string; reason: string }) => {
					threadName = options.name;
					return {
						id: "thread123",
						name: options.name,
					} as unknown as Message["thread"];
				},
			});

			yield* handleAutoThread(message);

			expect(threadName.length).toBeLessThanOrEqual(50);
			expect(threadName).toContain("...");
			expect(threadName.startsWith("TestUser -")).toBe(true);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses attachment name when message has no content", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			let threadName = "";

			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "",
				content: "",
				attachmentsSize: 1,
				attachmentName: "document.pdf",
				startThread: async (options: { name: string; reason: string }) => {
					threadName = options.name;
					return {
						id: "thread123",
						name: options.name,
					} as unknown as Message["thread"];
				},
			});

			yield* handleAutoThread(message);

			expect(threadName).toBe("TestUser - document.pdf");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses 'Attachment' fallback when attachment has no name", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild);
			discordMock.utilities.seedChannel(channel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: channel.id,
					serverId: serverLiveData._id,
					name: channel.name,
					type: channel.type,
				},
				settings: {
					channelId: channel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			let threadName = "";

			const message = discordMock.utilities.createMockMessage(channel, {
				cleanContent: "",
				content: "",
				attachmentsSize: 1,
				attachmentName: null,
				startThread: async (options: { name: string; reason: string }) => {
					threadName = options.name;
					return {
						id: "thread123",
						name: options.name,
					} as unknown as Message["thread"];
				},
			});

			yield* handleAutoThread(message);

			expect(threadName).toBe("TestUser - Attachment");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("works with GuildAnnouncement channel type", () =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild();
			discordMock.utilities.seedGuild(guild);
			const newsChannel = discordMock.utilities.createMockNewsChannel(guild);
			discordMock.utilities.seedChannel(newsChannel);

			yield* database.servers.upsertServer({
				name: guild.name,
				discordId: guild.id,
				plan: "FREE",
				approximateMemberCount: 0,
			});

			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: guild.id,
			});

			if (!serverLiveData?._id) {
				throw new Error("Server not found");
			}

			yield* database.channels.upsertChannelWithSettings({
				channel: {
					id: newsChannel.id,
					serverId: serverLiveData._id,
					name: newsChannel.name,
					type: newsChannel.type,
				},
				settings: {
					channelId: newsChannel.id,
					autoThreadEnabled: true,
					indexingEnabled: false,
					markSolutionEnabled: false,
					sendMarkSolutionInstructionsInNewThreads: false,
					forumGuidelinesConsentEnabled: false,
				},
			});

			let threadCreated = false;

			const message = discordMock.utilities.createMockMessage(newsChannel, {
				cleanContent: "Announcement message",
				startThread: async (options: { name: string; reason: string }) => {
					threadCreated = true;
					return {
						id: "thread123",
						name: options.name,
					} as unknown as Message["thread"];
				},
			});

			yield* handleAutoThread(message);

			expect(threadCreated).toBe(true);
		}).pipe(Effect.provide(TestLayer)),
	);
});
