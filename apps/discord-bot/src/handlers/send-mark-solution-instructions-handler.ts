import { Database } from "@packages/database/database";
import type { ThreadChannel } from "discord.js";
import { DiscordAPIError } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { isAllowedThreadChannel } from "../utils/conversions";
import { handleSendMarkSolutionInstructions } from "./send-mark-solution-instructions";

function fetchStarterMessageWithRetry(
	thread: ThreadChannel,
	delayMs: number,
): Effect.Effect<import("discord.js").Message | null, unknown> {
	return Effect.tryPromise({
		try: async () => {
			if (process.env.NODE_ENV !== "test") {
				await new Promise((resolve) => setTimeout(resolve, delayMs));
			}
			return await thread.fetchStarterMessage();
		},
		catch: (error) => {
			if (error instanceof DiscordAPIError && error.status === 404) {
				return null;
			}
			return error;
		},
	});
}

export const SendMarkSolutionInstructionsHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;
		const database = yield* Database;

		yield* discord.client.on("threadCreate", (thread) =>
			Effect.gen(function* () {
				if (!isAllowedThreadChannel(thread)) {
					return;
				}
				if (!thread.parentId) {
					return;
				}

				const parentChannel =
					yield* database.private.channels.findChannelByDiscordId({
						discordId: thread.parentId,
					});

				if (!parentChannel) {
					return;
				}

				if (!parentChannel.flags?.sendMarkSolutionInstructionsInNewThreads) {
					return;
				}

				const newlyCreated = !thread.archived;

				if (!newlyCreated) {
					return;
				}

				const firstMessage =
					(yield* fetchStarterMessageWithRetry(thread, 1000)) ||
					(yield* fetchStarterMessageWithRetry(thread, 10000));

				const questionAskerId = firstMessage?.author.id || thread.ownerId;

				if (!questionAskerId) {
					return;
				}

				const questionAsker =
					thread.guild.members.cache.get(questionAskerId) ||
					(yield* Effect.tryPromise({
						try: () => thread.guild.members.fetch(questionAskerId),
						catch: (error) => error,
					}));

				if (!questionAsker) {
					return;
				}

				yield* handleSendMarkSolutionInstructions(
					thread,
					newlyCreated,
					parentChannel,
					questionAsker,
					firstMessage ?? null,
				);
			}).pipe(
				Effect.catchAll((error) =>
					Console.error(
						`Error processing thread create for mark solution instructions ${thread.id}:`,
						error,
					),
				),
			),
		);
	}),
);
