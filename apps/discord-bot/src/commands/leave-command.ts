import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Console, Effect, Layer, Metric } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { catchAllWithReport } from "../utils/error-reporting";

const handleLeaveDMCommand = Effect.fn("leave_dm_command")(function* (
	message: Message,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
	});
	yield* Metric.increment(commandExecuted("leave"));

	const discord = yield* Discord;
	const content = message.content.trim();

	// duplicate check but is fine
	if (!content.startsWith("!leave")) {
		return;
	}

	if (message.author.id !== SUPER_USER_ID) {
		return;
	}

	const parts = content.split(/\s+/);
	const serverId = parts[1];

	if (serverId === "help" || !serverId) {
		yield* discord.callClient(() =>
			message.reply(
				[
					"**Leave Commands:**",
					"`!leave <serverId>` - Leave a specific server",
					"`!leave help` - Show this help message",
				].join("\n"),
			),
		);
		return;
	}

	yield* handleLeaveServer(message, serverId);
});

const handleLeaveServer = Effect.fn("leave_server")(function* (
	message: Message,
	serverId: string,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.channel_id": message.channelId,
		"discord.user_id": message.author.id,
		"discord.server_id": serverId,
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

	const guildName = guild.name;

	yield* discord.callClient(() => guild.leave());

	yield* discord.callClient(() =>
		message.reply(
			`Successfully left server **${guildName}** (\`${serverId}\`)`,
		),
	);
});

export const LeaveCommandHandlerLayer = Layer.scopedDiscard(
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

				if (!message.content.startsWith("!leave")) {
					return;
				}

				yield* handleLeaveDMCommand(message).pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							const discord = yield* Discord;
							yield* Console.error("Leave command error:", error);

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
