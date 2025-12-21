import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Clock, Console, Effect, Layer, Option } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { syncMissingThreadMessages } from "../services/sync-missing-thread-messages";
import { catchAllWithReport } from "../utils/error-reporting";

function formatDurationMs(ms: number): string {
	const hours = Math.floor(ms / 1000 / 60 / 60);
	const minutes = Math.floor((ms / 1000 / 60) % 60);
	const seconds = Math.floor((ms / 1000) % 60);

	if (hours > 0) {
		return `${hours}h ${minutes}m ${seconds}s`;
	}
	return `${minutes}m ${seconds}s`;
}

export const syncThreadsLock = Effect.unsafeMakeSemaphore(1);

function handleSyncThreadsDMCommand(message: Message) {
	return Effect.gen(function* () {
		const discord = yield* Discord;
		const content = message.content.trim();

		if (!content.startsWith("!sync-threads")) {
			return;
		}

		if (message.author.id !== SUPER_USER_ID) {
			return;
		}

		const parts = content.split(/\s+/);
		const subcommand = parts[1];

		if (subcommand === "start") {
			yield* handleSyncStart(message);
		} else if (subcommand === "status") {
			yield* handleSyncStatus(message);
		} else if (subcommand === "help" || !subcommand) {
			yield* discord.callClient(() =>
				message.reply(
					[
						"**Sync Threads Commands:**",
						"`!sync-threads start` - Sync all threads missing their root message",
						"`!sync-threads status` - Check if sync is running",
						"`!sync-threads help` - Show this help message",
					].join("\n"),
				),
			);
		} else {
			yield* discord.callClient(() =>
				message.reply(
					`Unknown subcommand: \`${subcommand}\`. Use \`!sync-threads help\` for available commands.`,
				),
			);
		}
	}).pipe(
		catchAllWithReport((error) =>
			Effect.gen(function* () {
				const discord = yield* Discord;
				yield* Console.error("Sync threads command error:", error);

				yield* discord.callClient(() =>
					message.reply(
						`Error: ${error instanceof Error ? error.message : String(error)}`,
					),
				);
			}),
		),
	);
}

function handleSyncStart(message: Message) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		const acquired = yield* syncThreadsLock.withPermitsIfAvailable(1)(
			Effect.gen(function* () {
				yield* discord.callClient(() =>
					message.reply("Starting sync of missing thread messages..."),
				);

				const startTime = yield* Clock.currentTimeMillis;
				const result = yield* syncMissingThreadMessages();
				const endTime = yield* Clock.currentTimeMillis;
				const duration = endTime - startTime;

				yield* discord.callClient(() =>
					message.reply(
						`Sync complete in ${formatDurationMs(duration)}\n` +
							`- Synced: ${result.synced}\n` +
							`- Skipped (not found): ${result.skipped}\n` +
							`- Failed: ${result.failed}`,
					),
				);

				return true;
			}),
		);

		if (Option.isNone(acquired)) {
			yield* discord.callClient(() =>
				message.reply(
					"Thread sync is already in progress. Please wait for it to complete.",
				),
			);
		}
	});
}

function handleSyncStatus(message: Message) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		const acquired = yield* syncThreadsLock.withPermitsIfAvailable(1)(
			Effect.succeed(true),
		);

		const isLocked = Option.isNone(acquired);

		yield* discord.callClient(() =>
			message.reply(
				isLocked
					? "Thread sync is currently in progress."
					: "No thread sync is running.",
			),
		);
	});
}

export const SyncThreadsCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("messageCreate", (message) =>
			Effect.gen(function* () {
				if (message.author.bot) {
					return;
				}

				if (message.channel.type !== ChannelType.DM) {
					return;
				}

				if (message.author.id !== SUPER_USER_ID) {
					return;
				}

				if (!message.content.startsWith("!sync-threads")) {
					return;
				}

				yield* handleSyncThreadsDMCommand(message);
			}),
		);
	}),
);
