import type { Message, ThreadChannel } from "discord.js-selfbot-v13";
import { Data, Duration, Effect } from "effect";

export class WaitTimeoutError extends Data.TaggedError("WaitTimeoutError")<{
	description: string;
	timeoutMs: number;
}> {
	override get message() {
		return `Timed out waiting for ${this.description} after ${this.timeoutMs}ms`;
	}
}

interface WaitForOptions {
	timeout?: Duration.DurationInput;
	interval?: Duration.DurationInput;
}

const waitForCondition = <T>(
	check: () => Effect.Effect<T | null | undefined, never, never>,
	description: string,
	options: WaitForOptions = {},
): Effect.Effect<T, WaitTimeoutError> => {
	const timeoutMs = Duration.toMillis(
		Duration.isDuration(options.timeout)
			? options.timeout
			: Duration.decode(options.timeout ?? "10 seconds"),
	);
	const intervalMs = Duration.toMillis(
		Duration.isDuration(options.interval)
			? options.interval
			: Duration.decode(options.interval ?? "500 millis"),
	);

	const startTime = Date.now();

	const loop: Effect.Effect<T, WaitTimeoutError> = Effect.gen(function* () {
		const result = yield* check();

		if (result !== null && result !== undefined) {
			return result;
		}

		if (Date.now() - startTime >= timeoutMs) {
			return yield* Effect.fail(
				new WaitTimeoutError({
					description,
					timeoutMs,
				}),
			);
		}

		yield* Effect.sleep(Duration.millis(intervalMs));
		return yield* loop;
	});

	return loop;
};

export const waitForBotReply = (
	thread: ThreadChannel,
	botId: string,
	options: WaitForOptions = {},
): Effect.Effect<Message, WaitTimeoutError> => {
	const check = () =>
		Effect.tryPromise({
			try: async () => {
				const messages = await thread.messages.fetch({ limit: 10 });
				const botMessage = messages.find((m) => m.author.id === botId);
				return botMessage ?? null;
			},
			catch: () => null,
		}).pipe(Effect.orElseSucceed(() => null));

	return waitForCondition(check, `bot reply from ${botId}`, options);
};

export const waitForReaction = (
	message: Message,
	emoji: string,
	options: WaitForOptions = {},
): Effect.Effect<boolean, WaitTimeoutError> => {
	const check = () =>
		Effect.tryPromise({
			try: async () => {
				const freshMessage = await message.fetch(true);
				const reaction = freshMessage.reactions.cache.find(
					(r) => r.emoji.name === emoji,
				);
				if (reaction && reaction.count > 0) {
					return true;
				}
				return null;
			},
			catch: () => null,
		}).pipe(Effect.orElseSucceed(() => null));

	return waitForCondition(check, `reaction ${emoji}`, options);
};

export const waitForThreadTag = (
	thread: ThreadChannel,
	tagId: string,
	options: WaitForOptions = {},
): Effect.Effect<boolean, WaitTimeoutError> => {
	const check = () =>
		Effect.tryPromise({
			try: async () => {
				const freshThread = (await thread.fetch(true)) as ThreadChannel;
				if (freshThread.appliedTags?.includes(tagId)) {
					return true;
				}
				return null;
			},
			catch: () => null,
		}).pipe(Effect.orElseSucceed(() => null));

	return waitForCondition(check, `thread tag ${tagId}`, options);
};

export { waitForCondition };
export type { WaitForOptions };
