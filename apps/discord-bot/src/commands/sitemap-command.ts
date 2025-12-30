import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Clock, Console, Effect, Layer, Option } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { runSitemapGenerationCore, sitemapLock } from "../services/sitemap";
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

const handleSitemapDMCommand = Effect.fn("sitemap_dm_command")(function* (
	message: Message,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});

	const discord = yield* Discord;
	const content = message.content.trim();

	if (!content.startsWith("!sitemap")) {
		return;
	}

	if (message.author.id !== SUPER_USER_ID) {
		return;
	}

	const parts = content.split(/\s+/);
	const subcommand = parts[1];

	if (subcommand === "start") {
		yield* handleSitemapStart(message);
	} else if (subcommand === "status") {
		yield* handleSitemapStatus(message);
	} else if (subcommand === "help" || !subcommand) {
		yield* discord.callClient(() =>
			message.reply(
				[
					"**Sitemap Commands:**",
					"`!sitemap start` - Start sitemap generation",
					"`!sitemap status` - Check if sitemap generation is running",
					"`!sitemap help` - Show this help message",
				].join("\n"),
			),
		);
	} else {
		yield* discord.callClient(() =>
			message.reply(
				`Unknown subcommand: \`${subcommand}\`. Use \`!sitemap help\` for available commands.`,
			),
		);
	}
});

const handleSitemapStart = Effect.fn("sitemap_start_command")(function* (
	message: Message,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});

	const discord = yield* Discord;

	const acquired = yield* sitemapLock.withPermitsIfAvailable(1)(
		Effect.gen(function* () {
			yield* discord.callClient(() =>
				message.reply("Starting sitemap generation..."),
			);

			const startTime = yield* Clock.currentTimeMillis;
			yield* runSitemapGenerationCore();
			const endTime = yield* Clock.currentTimeMillis;
			const duration = endTime - startTime;

			yield* discord.callClient(() =>
				message.reply(
					`Sitemap generation complete in ${formatDurationMs(duration)}`,
				),
			);

			return true;
		}),
	);

	if (Option.isNone(acquired)) {
		yield* discord.callClient(() =>
			message.reply(
				"Sitemap generation is already in progress. Please wait for it to complete.",
			),
		);
	}
});

const handleSitemapStatus = Effect.fn("sitemap_status_command")(function* (
	message: Message,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});

	const discord = yield* Discord;

	const acquired = yield* sitemapLock.withPermitsIfAvailable(1)(
		Effect.succeed(true),
	);

	const isLocked = Option.isNone(acquired);

	yield* discord.callClient(() =>
		message.reply(
			isLocked
				? "Sitemap generation is currently in progress."
				: "No sitemap generation is running.",
		),
	);
});

export const SitemapCommandHandlerLayer = Layer.scopedDiscard(
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

				if (!message.content.startsWith("!sitemap")) {
					return;
				}

				yield* handleSitemapDMCommand(message).pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							const discord = yield* Discord;
							yield* Console.error("Sitemap command error:", error);

							yield* discord.callClient(() =>
								message.reply(
									`Error: ${error instanceof Error ? error.message : String(error)}`,
								),
							);
						}),
					),
				);
			}),
		);
	}),
);
