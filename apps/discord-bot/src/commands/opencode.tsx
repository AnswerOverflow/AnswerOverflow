import { Reacord } from "@packages/reacord";
import type { ChatInputCommandInteraction } from "discord.js";
import { MessageFlags } from "discord.js";
import { Effect, Layer, Metric } from "effect";
import { SUPER_USER_ID } from "../constants/super-user";
import { Discord } from "../core/discord-service";
import { OpenCode } from "../core/opencode-service";
import { commandExecuted } from "../metrics";
import {
	OpenCodeNewSession,
	OpenCodeSessionList,
	OpenCodeViewer,
} from "../opencode";
import { catchAllWithReport } from "../utils/error-reporting";

export const handleOpenCodeCommand = Effect.fn("opencode_command")(function* (
	interaction: ChatInputCommandInteraction,
) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
	});
	yield* Metric.increment(commandExecuted("opencode"));

	const discord = yield* Discord;
	const reacord = yield* Reacord;
	const opencode = yield* OpenCode;

	if (interaction.user.id !== SUPER_USER_ID) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This command is only available to Rhys.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	const subcommand = interaction.options.getSubcommand();
	const client = opencode.client;

	switch (subcommand) {
		case "session": {
			const sessionId = interaction.options.getString("id");
			if (sessionId) {
				yield* reacord.reply(
					interaction,
					<OpenCodeViewer client={client} sessionId={sessionId} />,
				);
			} else {
				yield* reacord.reply(
					interaction,
					<OpenCodeSessionList client={client} />,
				);
			}
			break;
		}

		case "new": {
			const prompt = interaction.options.getString("prompt");
			const agent = interaction.options.getString("agent") ?? undefined;
			yield* reacord.reply(
				interaction,
				<OpenCodeNewSession
					client={client}
					serverUrl={opencode.serverUrl}
					initialPrompt={prompt ?? undefined}
					agent={agent}
				/>,
			);
			break;
		}

		case "prompt": {
			const prompt = interaction.options.getString("prompt", true);
			const sessionId = interaction.options.getString("session");
			const agent = interaction.options.getString("agent") ?? undefined;

			if (sessionId) {
				yield* Effect.tryPromise(() =>
					client.session.prompt({
						path: { id: sessionId },
						body: {
							parts: [{ type: "text", text: prompt }],
							agent,
						},
					}),
				);
				yield* reacord.reply(
					interaction,
					<OpenCodeViewer client={client} sessionId={sessionId} />,
				);
			} else {
				yield* reacord.reply(
					interaction,
					<OpenCodeNewSession
						client={client}
						serverUrl={opencode.serverUrl}
						initialPrompt={prompt}
						agent={agent}
					/>,
				);
			}
			break;
		}

		default: {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: `Unknown subcommand: ${subcommand}`,
				}),
			);
		}
	}
});

export const OpenCodeCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					!interaction.isChatInputCommand() ||
					interaction.commandName !== "opencode"
				) {
					return;
				}
				yield* handleOpenCodeCommand(interaction).pipe(
					catchAllWithReport((error) =>
						Effect.gen(function* () {
							const discord = yield* Discord;
							console.error("OpenCode command error:", error);

							yield* discord.callClient(() =>
								interaction.editReply({
									content: `An error occurred: ${error instanceof Error ? error.message : String(error)}`,
								}),
							);
						}),
					),
				);
			}),
		);
	}),
);
