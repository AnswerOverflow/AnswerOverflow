import type { Message, ThreadChannel } from "discord.js-selfbot-v13";
import { Data, Duration, Effect, Option, Schedule } from "effect";

export class WaitTimeoutError extends Data.TaggedError("WaitTimeoutError")<{
	description: string;
	timeout: Duration.Duration;
}> {
	override get message() {
		return `Timed out waiting for ${this.description} after ${Duration.format(this.timeout)}`;
	}
}

export interface WaitForOptions {
	timeout?: Duration.DurationInput;
	interval?: Duration.DurationInput;
}

const DEFAULT_TIMEOUT = Duration.seconds(10);
const DEFAULT_INTERVAL = Duration.millis(500);

class NotYetError extends Data.TaggedError("NotYetError") {}

const waitForCondition = <T>(
	check: Effect.Effect<Option.Option<T>>,
	description: string,
	options: WaitForOptions = {},
): Effect.Effect<T, WaitTimeoutError> => {
	const timeout = Duration.decode(options.timeout ?? DEFAULT_TIMEOUT);
	const interval = Duration.decode(options.interval ?? DEFAULT_INTERVAL);

	const schedule = Schedule.spaced(interval).pipe(
		Schedule.compose(Schedule.elapsed),
		Schedule.whileOutput(Duration.lessThan(timeout)),
	);

	return check.pipe(
		Effect.flatMap(
			Option.match({
				onNone: () => Effect.fail(new NotYetError()),
				onSome: Effect.succeed,
			}),
		),
		Effect.retry(schedule),
		Effect.mapError(() => new WaitTimeoutError({ description, timeout })),
	);
};

export const waitForBotReply = (
	thread: ThreadChannel,
	botId: string,
	options: WaitForOptions = {},
): Effect.Effect<Message, WaitTimeoutError> =>
	waitForCondition(
		Effect.tryPromise({
			try: async () => {
				const messages = await thread.messages.fetch({ limit: 10 });
				return Option.fromNullable(messages.find((m) => m.author.id === botId));
			},
			catch: () => Option.none<Message>(),
		}).pipe(Effect.catchAll(() => Effect.succeed(Option.none<Message>()))),
		`bot reply from ${botId}`,
		options,
	);

export const waitForReaction = (
	message: Message,
	emoji: string,
	options: WaitForOptions = {},
): Effect.Effect<true, WaitTimeoutError> =>
	waitForCondition(
		Effect.tryPromise({
			try: async () => {
				const freshMessage = await message.fetch(true);
				const reaction = freshMessage.reactions.cache.find(
					(r) => r.emoji.name === emoji,
				);
				return reaction && reaction.count > 0
					? Option.some(true as const)
					: Option.none<true>();
			},
			catch: () => Option.none<true>(),
		}).pipe(Effect.catchAll(() => Effect.succeed(Option.none<true>()))),
		`reaction ${emoji}`,
		options,
	);

export const waitForThreadTag = (
	thread: ThreadChannel,
	tagId: string,
	options: WaitForOptions = {},
): Effect.Effect<true, WaitTimeoutError> =>
	waitForCondition(
		Effect.tryPromise({
			try: async () => {
				const freshThread = (await thread.fetch(true)) as ThreadChannel;
				return freshThread.appliedTags?.includes(tagId)
					? Option.some(true as const)
					: Option.none<true>();
			},
			catch: () => Option.none<true>(),
		}).pipe(Effect.catchAll(() => Effect.succeed(Option.none<true>()))),
		`thread tag ${tagId}`,
		options,
	);

export { waitForCondition };
