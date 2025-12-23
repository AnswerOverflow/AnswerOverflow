import { Database } from "@packages/database/database";
import type { ChatInputCommandInteraction } from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	type MessageActionRowComponentBuilder,
	MessageFlags,
} from "discord.js";
import { Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import { trackLeaderboardViewed } from "../utils/analytics";
import {
	catchAllSilentWithReport,
	catchAllSucceedNullWithReport,
} from "../utils/error-reporting";

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

export const handleLeaderboardCommand = Effect.fn("leaderboard_command")(
	function* (interaction: ChatInputCommandInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
		});
		yield* Metric.increment(commandExecuted("leaderboard"));

		const database = yield* Database;
		const discord = yield* Discord;

		const isEphemeral = interaction.options.getBoolean("ephemeral") ?? false;

		yield* discord.callClient(() =>
			interaction.deferReply(
				isEphemeral ? { flags: MessageFlags.Ephemeral } : {},
			),
		);

		if (!interaction.guildId) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "This command can only be used in a server",
				}),
			);
			return;
		}

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(interaction.guildId),
			},
		);

		const server = serverLiveData;

		if (!server) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Server not found in database",
				}),
			);
			return;
		}

		const topSolversLiveData =
			yield* database.private.messages.getTopQuestionSolversByServerId({
				serverId: server.discordId,
				limit: 10,
			});

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

		const guild = interaction.guild;
		if (guild) {
			const member = yield* catchAllSucceedNullWithReport(
				discord.callClient(() => guild.members.fetch(interaction.user.id)),
			);
			if (member) {
				yield* catchAllSilentWithReport(trackLeaderboardViewed(member));
			}
		}

		yield* discord.callClient(() =>
			interaction.editReply({
				embeds: [embed],
				components,
			}),
		);
	},
);

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
				yield* handleLeaderboardCommand(interaction);
			}),
		);
	}),
);
