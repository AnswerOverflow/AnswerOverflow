import { Database, DatabaseLayer } from "@packages/database/database";
import type { ChatInputCommandInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
} from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";

const medalMap = new Map<number, string>([
	[0, ":first_place:"],
	[1, ":second_place:"],
	[2, ":third_place:"],
]);

const DISMISS_ACTION_PREFIX = "dismiss";
const DISMISS_BUTTON_LABEL = "Dismiss";

function makeDismissButton(dismisserId: string): ButtonBuilder {
	return new ButtonBuilder({
		label: DISMISS_BUTTON_LABEL,
		style: ButtonStyle.Secondary,
		customId: `${DISMISS_ACTION_PREFIX}:${dismisserId}`,
	});
}

export function handleLeaderboardCommand(
	interaction: ChatInputCommandInteraction,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		const isEphemeral = interaction.options.getBoolean("ephemeral") ?? false;

		yield* Effect.tryPromise({
			try: () => interaction.deferReply({ ephemeral: isEphemeral }),
			catch: (error) => error,
		});

		if (!interaction.guildId) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "This command can only be used in a server",
					}),
				catch: () => undefined,
			});
			return;
		}

		const serverLiveData = yield* Effect.scoped(
			database.servers.getServerByDiscordId({ discordId: interaction.guildId }),
		);

		const server = serverLiveData;

		if (!server) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Server not found in database",
					}),
				catch: () => undefined,
			});
			return;
		}

		const topSolversLiveData = yield* Effect.scoped(
			database.messages.getTopQuestionSolversByServerId({
				serverId: server.discordId,
				limit: 10,
			}),
		);

		const topSolvers = topSolversLiveData ?? [];

		const embedDescription =
			topSolvers.length === 0
				? "No solutions have been marked yet in this server."
				: topSolvers
						.map((solver, i) => {
							const medal = medalMap.get(i);
							const msg = `<@${solver.authorId}> - ${solver.count} solved`;
							const position = i + 1;
							const spacer = position < 10 ? "\u200B \u200B \u200B" : "\u200B ";
							return medal
								? `${medal}: ${msg}`
								: ` ${spacer} ${position}\u200B: ${msg}`;
						})
						.join("\n");

		const embed = new EmbedBuilder()
			.setTitle("Leaderboard - Questions Solved")
			.setDescription(embedDescription)
			.setColor("#89D3F8")
			.setTimestamp();

		const components = isEphemeral
			? []
			: [
					new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
						makeDismissButton(interaction.user.id),
					),
				];

		yield* Effect.tryPromise({
			try: () =>
				interaction.editReply({
					embeds: [embed],
					components,
				}),
			catch: (error) => {
				console.error("Error editing reply:", error);
				return error;
			},
		});
	});
}

export const LeaderboardCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "leaderboard"
				) {
					return;
				}
				yield* Effect.scoped(
					handleLeaderboardCommand(interaction).pipe(
						Effect.provide(DatabaseLayer),
						Effect.catchAll((error) =>
							Console.error("Error in leaderboard command:", error),
						),
					),
				);
			}),
		);
	}),
);
