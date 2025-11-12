import { DatabaseLayer } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { handleLeaderboardCommand } from "../handlers/commands/leaderboard-command";
import { handleManageAccountCommand } from "../handlers/commands/manage-account-command";
import { handleDismissButtonInteraction } from "../handlers/interactions/dismiss-button";
import { handleMarkSolutionCommand } from "../handlers/interactions/mark-solution-command";

/**
 * Layer that sets up interaction event handlers (commands and buttons)
 */
export const InteractionHandlersLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		// Subscribe to interactionCreate event for slash commands and buttons
		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				// Handle button interactions (dismiss button)
				if (interaction.isButton()) {
					if (interaction.customId.startsWith("dismiss:")) {
						yield* handleDismissButtonInteraction(interaction).pipe(
							Effect.catchAll((error) =>
								Console.error("Error in dismiss button handler:", error),
							),
						);
					}
					// Manage account buttons are handled by the collector in handleManageAccountCommand
					return;
				}

				// Handle context menu commands
				if (interaction.isContextMenuCommand()) {
					if (interaction.commandName === "✅ Mark Solution") {
						yield* Effect.scoped(
							handleMarkSolutionCommand(interaction).pipe(
								Effect.provide(DatabaseLayer),
								Effect.catchAll((error) =>
									Console.error("Error in mark solution command:", error),
								),
							),
						);
					}
					return;
				}

				// Handle chat input commands (slash commands)
				if (interaction.isChatInputCommand()) {
					if (interaction.commandName === "leaderboard") {
						yield* Effect.scoped(
							handleLeaderboardCommand(interaction).pipe(
								Effect.provide(DatabaseLayer),
								Effect.catchAll((error) =>
									Console.error("Error in leaderboard command:", error),
								),
							),
						);
					} else if (interaction.commandName === "manage-account") {
						yield* Effect.scoped(
							handleManageAccountCommand(interaction).pipe(
								Effect.provide(DatabaseLayer),
								Effect.catchAll((error) =>
									Console.error("Error in manage account command:", error),
								),
							),
						);
					}
					return;
				}

				// TODO: Add handlers for other slash commands (manage-account, consent)
			}),
		);
	}),
);
