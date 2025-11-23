import {
	Database,
	DatabaseLayer,
	upsertMessage,
} from "@packages/database/database";
import type { ContextMenuCommandInteraction } from "discord.js";
import { Console, Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { toAOMessage } from "../utils/conversions";
import { makeMarkSolutionResponse } from "./mark-solution";

export function handleMarkSolutionCommand(
	interaction: ContextMenuCommandInteraction,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		yield* Effect.tryPromise({
			try: () => interaction.deferReply({ ephemeral: false }),
			catch: (error) => error,
		});

		if (!interaction.channel) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Channel not found",
					}),
				catch: () => undefined,
			});
			return;
		}

		const targetMessage = yield* Effect.tryPromise({
			try: () => {
				if (!interaction.channel) {
					return Promise.resolve(undefined);
				}
				return interaction.channel.messages.fetch(interaction.targetId);
			},
			catch: (error) => error,
		});

		if (!targetMessage) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Failed to fetch the target message",
					}),
				catch: () => undefined,
			});
			return;
		}

		if (!targetMessage.guildId) {
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
			database.private.servers.getServerByDiscordId({
				discordId: targetMessage.guildId,
			}),
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

		if (!targetMessage.channel.isThread()) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "This command can only be used in a thread",
					}),
				catch: () => undefined,
			});
			return;
		}

		const thread = targetMessage.channel;
		const parentChannel = thread.parent;

		if (!parentChannel) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Parent channel not found",
					}),
				catch: () => undefined,
			});
			return;
		}

		const channelLiveData = yield* Effect.scoped(
			database.private.channels.findChannelByDiscordId({
				discordId: parentChannel.id,
			}),
		);

		const channelSettings = channelLiveData;

		if (!channelSettings || !channelSettings.flags?.markSolutionEnabled) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Mark solution is not enabled for this channel",
					}),
				catch: () => undefined,
			});
			return;
		}

		let questionMessage = null;

		if (parentChannel.type === 15) {
			const fetchedMessage = yield* Effect.tryPromise({
				try: () => thread.messages.fetch(thread.id),
				catch: () => null,
			});
			questionMessage = fetchedMessage ?? null;
		} else if (parentChannel.type === 0 || parentChannel.type === 5) {
			if ("messages" in parentChannel) {
				const fetchedMessage = yield* Effect.tryPromise({
					try: () => parentChannel.messages.fetch(thread.id),
					catch: () => null,
				});
				questionMessage = fetchedMessage ?? null;
			}
		}

		if (!questionMessage) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Could not find the question message",
					}),
				catch: () => undefined,
			});
			return;
		}

		if (questionMessage.id === targetMessage.id) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "You cannot mark the question as its own solution",
					}),
				catch: () => undefined,
			});
			return;
		}

		const guild = targetMessage.guild;
		if (!guild) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Guild not found",
					}),
				catch: () => undefined,
			});
			return;
		}

		const guildMember = yield* Effect.tryPromise({
			try: () => guild.members.fetch(interaction.user.id),
			catch: () => null,
		});

		if (!guildMember) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Could not fetch your member information",
					}),
				catch: () => undefined,
			});
			return;
		}

		const isQuestionAuthor = questionMessage.author.id === interaction.user.id;
		const hasPermission =
			parentChannel.permissionsFor(guildMember)?.has("ManageThreads") ?? false;

		if (!isQuestionAuthor && !hasPermission) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content:
							"You must be the question author or have ManageThreads permission to mark a solution",
					}),
				catch: () => undefined,
			});
			return;
		}

		const serverPreferencesLiveData = yield* Effect.scoped(
			database.private.server_preferences.getServerPreferencesByServerId({
				serverId: server.discordId,
			}),
		);
		const serverPreferences = serverPreferencesLiveData ?? null;

		yield* Effect.promise(async () => {
			const solutionMessage = await toAOMessage(
				targetMessage,
				server.discordId,
			);
			await upsertMessage(
				{
					...solutionMessage,
					questionId: questionMessage.id,
				},
				{ ignoreChecks: false },
			);

			if (
				parentChannel.type === 15 &&
				channelSettings?.solutionTagId &&
				thread.appliedTags.length < 5
			) {
				await thread.setAppliedTags([
					...thread.appliedTags,
					channelSettings.solutionTagId,
				]);
			} else {
				await questionMessage.react("✅");
			}

			try {
				await targetMessage.react("✅");
			} catch {}
		}).pipe(
			Effect.catchAll((error) =>
				Effect.gen(function* () {
					console.error("Error marking solution:", error);
					yield* Effect.tryPromise({
						try: () =>
							interaction.editReply({
								content: "An error occurred while marking the solution",
							}),
						catch: () => undefined,
					});
					return yield* Effect.fail(error);
				}),
			),
		);

		if (!channelSettings || !channelSettings.flags) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Channel settings not found",
					}),
				catch: () => undefined,
			});
			return;
		}

		const { embed, components } = makeMarkSolutionResponse({
			solution: targetMessage,
			server: {
				name: server.name,
				_id: server._id,
			},
			serverPreferences,
			channelSettings: {
				...channelSettings,
				flags: channelSettings.flags,
			},
		});

		yield* Effect.tryPromise({
			try: () =>
				interaction.editReply({
					embeds: [embed],
					components: components ? [components] : undefined,
				}),
			catch: (error) => {
				console.error("Error editing reply:", error);
				return error;
			},
		});
	});
}

export const MarkSolutionCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isContextMenuCommand() &&
					interaction.commandName === "✅ Mark Solution"
				) {
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
			}),
		);
	}),
);
