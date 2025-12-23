import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Clock, Console, Effect, Layer, Metric, Option } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import {
	indexingLock,
	runIndexingCore,
	runIndexingForGuild,
} from "../services/indexing";
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

const handleIndexDMCommand = Effect.fn("index_dm_command")(function* (
	message: Message,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": message.guildId ?? "dm",
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});
	yield* Metric.increment(commandExecuted("index"));

	const discord = yield* Discord;
	const content = message.content.trim();

	if (!content.startsWith("!index")) {
		return;
	}

	if (message.author.id !== SUPER_USER_ID) {
		return;
	}

	const parts = content.split(/\s+/);
	const subcommand = parts[1];

	if (subcommand === "start") {
		const target = parts[2] ?? "all";

		if (target === "all") {
			yield* handleIndexAll(message);
		} else {
			yield* handleIndexServer(message, target);
		}
	} else if (subcommand === "status") {
		yield* handleIndexStatus(message);
	} else if (subcommand === "help" || !subcommand) {
		yield* discord.callClient(() =>
			message.reply(
				[
					"**Index Commands:**",
					"`!index start all` - Index all servers",
					"`!index start <serverId>` - Index a specific server",
					"`!index status` - Check if indexing is running",
					"`!index help` - Show this help message",
				].join("\n"),
			),
		);
	} else {
		yield* discord.callClient(() =>
			message.reply(
				`Unknown subcommand: \`${subcommand}\`. Use \`!index help\` for available commands.`,
			),
		);
	}
});

const handleIndexAll = Effect.fn("index_all_command")(function* (
	message: Message,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": message.guildId ?? "dm",
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});

	const discord = yield* Discord;

	const acquired = yield* indexingLock.withPermitsIfAvailable(1)(
		Effect.gen(function* () {
			yield* discord.callClient(() =>
				message.reply("Starting indexing for all servers..."),
			);

			const startTime = yield* Clock.currentTimeMillis;
			yield* runIndexingCore();
			const endTime = yield* Clock.currentTimeMillis;
			const duration = endTime - startTime;

			yield* discord.callClient(() =>
				message.reply(`Indexing complete in ${formatDurationMs(duration)}`),
			);

			return true;
		}),
	);

	if (Option.isNone(acquired)) {
		yield* discord.callClient(() =>
			message.reply(
				"Indexing is already in progress. Please wait for it to complete.",
			),
		);
	}
});

const handleIndexServer = Effect.fn("index_server_command")(function* (
	message: Message,
	serverId: string,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": serverId,
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});

	const discord = yield* Discord;

	const guild = yield* discord.use("get_guild", (client) =>
		client.guilds.cache.get(serverId),
	);

	if (!guild) {
		yield* discord.callClient(() =>
			message.reply(
				`Could not find server with ID \`${serverId}\`. Make sure the bot is in that server.`,
			),
		);
		return;
	}

	const acquired = yield* indexingLock.withPermitsIfAvailable(1)(
		Effect.gen(function* () {
			yield* discord.callClient(() =>
				message.reply(`Starting indexing for **${guild.name}**...`),
			);

			const startTime = yield* Clock.currentTimeMillis;
			yield* runIndexingForGuild(guild);
			const endTime = yield* Clock.currentTimeMillis;
			const duration = endTime - startTime;

			yield* discord.callClient(() =>
				message.reply(
					`Indexing for **${guild.name}** complete in ${formatDurationMs(duration)}`,
				),
			);

			return true;
		}),
	);

	if (Option.isNone(acquired)) {
		yield* discord.callClient(() =>
			message.reply(
				"Indexing is already in progress. Please wait for it to complete.",
			),
		);
	}
});

const handleIndexStatus = Effect.fn("index_status_command")(function* (
	message: Message,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": message.guildId ?? "dm",
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});

	const discord = yield* Discord;

	const acquired = yield* indexingLock.withPermitsIfAvailable(1)(
		Effect.succeed(true),
	);

	const isLocked = Option.isNone(acquired);

	yield* discord.callClient(() =>
		message.reply(
			isLocked
				? "Indexing is currently in progress."
				: "No indexing is running.",
		),
	);
});

export const IndexCommandHandlerLayer = Layer.scopedDiscard(
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

				if (!message.content.startsWith("!index")) {
					return;
				}

				yield* handleIndexDMCommand(message).pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							const discord = yield* Discord;
							yield* Console.error("Index command error:", error);

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
