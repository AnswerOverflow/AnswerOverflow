import { expect, it } from "@effect/vitest";
import { assertLeft } from "@effect/vitest/utils";
import { ChannelType, MessageType } from "discord.js";
import { Effect, type Either } from "effect";
import { describe } from "vitest";
import { DiscordScenario } from "../test/discord-scenario.ts";
import { TestLayer } from "../utils/layers";
import {
	AutoThreadError,
	AutoThreadErrorCode,
	handleAutoThread,
} from "./auto-thread";

const expectError = <E>(result: Either.Either<unknown, E>, expectedError: E) =>
	assertLeft(result, expectedError);

describe("handleAutoThread", () => {
	it.scoped("returns early for DM channel", () =>
		Effect.gen(function* () {
			const { messages } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ inDM: true }],
			});
			const result = yield* handleAutoThread(messages[0]!).pipe(Effect.either);
			expectError(
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
			const { messages } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ inVoice: true }],
			});
			const result = yield* handleAutoThread(messages[0]!).pipe(Effect.either);
			expectError(
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
			const { messages } = yield* DiscordScenario.textChannel({
				channel: { type: ChannelType.GuildForum },
				settings: { autoThreadEnabled: true },
				messages: [{}],
			});
			const result = yield* handleAutoThread(messages[0]!).pipe(Effect.either);
			expectError(
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
			const { messages } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ author: { bot: true, username: "BotUser" } }],
			});
			const result = yield* handleAutoThread(messages[0]!).pipe(Effect.either);
			expectError(
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
			const { messages } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ type: MessageType.Reply }],
			});
			const result = yield* handleAutoThread(messages[0]!).pipe(Effect.either);
			expectError(
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
			const { messages } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ hasThread: true }],
			});
			const result = yield* handleAutoThread(messages[0]!).pipe(Effect.either);
			expectError(
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
			const { messages } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: false },
				messages: [{}],
			});
			const result = yield* handleAutoThread(messages[0]!).pipe(Effect.either);
			expectError(
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
			const { messages, threadTrackers } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ content: "Hello world" }],
			});
			yield* handleAutoThread(messages[0]!);
			const tracker = threadTrackers.get(messages[0]!.id)!;
			expect(tracker.wasCreated()).toBe(true);
			expect(tracker.name()).toBe("TestUser - Hello world");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses nickname when available", () =>
		Effect.gen(function* () {
			const { messages, threadTrackers } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ content: "Test message", memberNickname: "CoolNickname" }],
			});
			yield* handleAutoThread(messages[0]!);
			const tracker = threadTrackers.get(messages[0]!.id)!;
			expect(tracker.name()).toBe("CoolNickname - Test message");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("removes Discord markdown from thread title", () =>
		Effect.gen(function* () {
			const { messages, threadTrackers } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ content: "*bold* _italic_ ~strike~ `code`" }],
			});
			yield* handleAutoThread(messages[0]!);
			const tracker = threadTrackers.get(messages[0]!.id)!;
			expect(tracker.name()).toBe("TestUser - bold italic strike code");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("truncates long thread titles", () =>
		Effect.gen(function* () {
			const longContent = "a".repeat(100);
			const { messages, threadTrackers } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ content: longContent }],
			});
			yield* handleAutoThread(messages[0]!);
			const tracker = threadTrackers.get(messages[0]!.id)!;
			const threadName = tracker.name();
			expect(threadName.length).toBeLessThanOrEqual(50);
			expect(threadName).toContain("...");
			expect(threadName.startsWith("TestUser -")).toBe(true);
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses attachment name when message has no content", () =>
		Effect.gen(function* () {
			const { messages, threadTrackers } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ content: "", attachments: [{ name: "document.pdf" }] }],
			});
			yield* handleAutoThread(messages[0]!);
			const tracker = threadTrackers.get(messages[0]!.id)!;
			expect(tracker.name()).toBe("TestUser - document.pdf");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("uses 'Attachment' fallback when attachment has no name", () =>
		Effect.gen(function* () {
			const { messages, threadTrackers } = yield* DiscordScenario.textChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ content: "", attachments: [{ name: null }] }],
			});
			yield* handleAutoThread(messages[0]!);
			const tracker = threadTrackers.get(messages[0]!.id)!;
			expect(tracker.name()).toBe("TestUser - Attachment");
		}).pipe(Effect.provide(TestLayer)),
	);

	it.scoped("works with GuildAnnouncement channel type", () =>
		Effect.gen(function* () {
			const { messages, threadTrackers } = yield* DiscordScenario.newsChannel({
				settings: { autoThreadEnabled: true },
				messages: [{ content: "Announcement message" }],
			});
			yield* handleAutoThread(messages[0]!);
			const tracker = threadTrackers.get(messages[0]!.id)!;
			expect(tracker.wasCreated()).toBe(true);
		}).pipe(Effect.provide(TestLayer)),
	);
});
