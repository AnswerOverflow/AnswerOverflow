import { DatabaseLayer } from "@packages/database/database";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { handleDismissButtonInteraction } from "./dismiss-button";
import { handleLeaderboardCommand } from "./leaderboard-command";
import { handleManageAccountCommand } from "./manage-account-command";
import { handleMarkSolutionCommand } from "./mark-solution-command";

export const InteractionHandlersLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (interaction.isButton()) {
					if (interaction.customId.startsWith("dismiss:")) {
						yield* handleDismissButtonInteraction(interaction).pipe(
							Effect.catchAll((error) =>
								Console.error("Error in dismiss button handler:", error),
							),
						);
					}
					return;
				}

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
			}),
		);
	}),
);
