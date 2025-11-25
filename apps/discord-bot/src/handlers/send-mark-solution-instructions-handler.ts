import { Database } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { isAllowedThreadChannel } from "../utils/conversions";
import { handleSendMarkSolutionInstructions } from "./send-mark-solution-instructions";

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
						discordId: BigInt(thread.parentId),
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

				const firstMessage = yield* discord.callClient(() =>
					thread.fetchStarterMessage(),
				);

				const questionAskerId = firstMessage?.author.id || thread.ownerId;

				if (!questionAskerId) {
					return;
				}

				const questionAsker = yield* discord.callClient(
					() =>
						thread.guild.members.cache.get(questionAskerId) ||
						thread.guild.members.fetch(questionAskerId),
				);

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
