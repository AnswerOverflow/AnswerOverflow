import type { Message } from "discord.js";
import { ChannelType } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { catchAllWithReport } from "../utils/error-reporting";

function handleLeaveDMCommand(message: Message) {
	return Effect.gen(function* () {
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
	}).pipe(
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
}

function handleLeaveServer(message: Message, serverId: string) {
	return Effect.gen(function* () {
		const discord = yield* Discord;

		const guild = yield* discord.use((client) =>
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
}

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

				yield* handleLeaveDMCommand(message);
			}),
		);
	}),
);
