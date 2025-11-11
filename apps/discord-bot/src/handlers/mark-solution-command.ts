import { Database, upsertMessage } from "@packages/database/database";
import type { ContextMenuCommandInteraction } from "discord.js";
import { Effect } from "effect";
import { toAOMessage } from "../utils/conversions";
import { makeMarkSolutionResponse } from "./mark-solution";

/**
 * Handles the "Mark Solution" context menu command
 * This is a simplified version that reuses logic from the reaction handler
 */
export function handleMarkSolutionCommand(
	interaction: ContextMenuCommandInteraction,
): Effect.Effect<void, unknown, Database> {
	return Effect.gen(function* () {
		const database = yield* Database;

		// Defer reply since this might take a moment
		yield* Effect.tryPromise({
			try: () => interaction.deferReply({ ephemeral: false }),
			catch: (error) => error,
		});

		// Get the target message
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
			try: () => interaction.channel?.messages.fetch(interaction.targetId),
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

		// Get server
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
			database.servers.getServerByDiscordId(targetMessage.guildId),
		);
		yield* Effect.sleep("10 millis");
		const server = serverLiveData?.data;

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

		// Check if message is in a thread
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

		// Get channel settings
		const channelLiveData = yield* Effect.scoped(
			database.channels.getChannelByDiscordId(parentChannel.id),
		);
		yield* Effect.sleep("10 millis");
		const channelSettings = channelLiveData?.data;

		if (!channelSettings?.flags.markSolutionEnabled) {
			yield* Effect.tryPromise({
				try: () =>
					interaction.editReply({
						content: "Mark solution is not enabled for this channel",
					}),
				catch: () => undefined,
			});
			return;
		}

		// Find the question message (thread starter)
		let questionMessage = null;

		if (parentChannel.type === 15) {
			// GuildForum
			const fetchedMessage = yield* Effect.tryPromise({
				try: () => thread.messages.fetch(thread.id),
				catch: () => null,
			});
			questionMessage = fetchedMessage ?? null;
		} else if (parentChannel.type === 0 || parentChannel.type === 5) {
			// Text channel or Announcement channel thread
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

		// Can't mark question as solution
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

		// Check permissions
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

		// User must be question author or have ManageThreads permission
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

		// Get server preferences
		const serverPreferencesLiveData = yield* Effect.scoped(
			database.serverPreferences.getServerPreferencesByServerId(server._id),
		);
		yield* Effect.sleep("10 millis");
		const serverPreferences = serverPreferencesLiveData?.data ?? null;

		// Mark as solved
		yield* Effect.promise(async () => {
			// Update solution message with questionId
			const solutionMessage = await toAOMessage(targetMessage, server._id);
			await upsertMessage(
				{
					...solutionMessage,
					questionId: questionMessage.id,
				},
				{ ignoreChecks: false },
			);

			// Add solved indicator
			if (
				parentChannel.type === 15 &&
				channelSettings.solutionTagId &&
				thread.appliedTags.length < 5
			) {
				// Forum channel: add solved tag
				await thread.setAppliedTags([
					...thread.appliedTags,
					channelSettings.solutionTagId,
				]);
			} else {
				// Text channel: add checkmark reaction
				await questionMessage.react("✅");
			}

			// React to solution message
			try {
				await targetMessage.react("✅");
			} catch {
				// Ignore if already reacted
			}
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

		// Send success response
		const { embed, components } = makeMarkSolutionResponse({
			solution: targetMessage,
			server: {
				name: server.name,
				_id: server._id,
			},
			serverPreferences,
			channelSettings,
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
