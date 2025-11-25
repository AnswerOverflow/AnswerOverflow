import { Database } from "@packages/database/database";
import type { ContextMenuCommandInteraction } from "discord.js";
import { Effect, Layer } from "effect";
import { Discord } from "../core/discord-service";
import { toAOMessage } from "../utils/conversions";
import { makeMarkSolutionResponse } from "./mark-solution";

export function handleMarkSolutionCommand(
	interaction: ContextMenuCommandInteraction,
) {
	return Effect.gen(function* () {
		const database = yield* Database;
		const discord = yield* Discord;

		yield* discord.callClient(() =>
			interaction.deferReply({ ephemeral: false }),
		);

		if (!interaction.channel) {
			yield* discord.callClient(() =>
				interaction.editReply({ content: "Channel not found" }),
			);
			return;
		}

		const targetMessage = yield* discord.callClient(() =>
			interaction.channel?.messages.fetch(interaction.targetId),
		);
		if (!targetMessage) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Failed to fetch the target message",
				}),
			);
			return;
		}

		if (!targetMessage.guildId) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "This command can only be used in a server",
				}),
			);
			return;
		}

		const server = yield* database.private.servers.getServerByDiscordId({
			discordId: targetMessage.guildId,
		});

		if (!server) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Server not found in database",
				}),
			);
			return;
		}

		if (!targetMessage.channel.isThread()) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "This command can only be used in a thread",
				}),
			);
			return;
		}

		const thread = targetMessage.channel;
		const parentChannel = thread.parent;

		if (!parentChannel) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Parent channel not found",
				}),
			);
			return;
		}

		const channelSettings =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: parentChannel.id,
			});

		if (!channelSettings || !channelSettings.flags?.markSolutionEnabled) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Mark solution is not enabled for this channel",
				}),
			);
			return;
		}

		let questionMessage = null;

		if (parentChannel.type === 15) {
			const fetchedMessage = yield* discord
				.callClient(() => thread.messages.fetch(thread.id))
				.pipe(Effect.catchAll(() => Effect.succeed(null)));
			questionMessage = fetchedMessage ?? null;
		} else if (parentChannel.type === 0 || parentChannel.type === 5) {
			if ("messages" in parentChannel) {
				const fetchedMessage = yield* discord
					.callClient(() => parentChannel.messages.fetch(thread.id))
					.pipe(Effect.catchAll(() => Effect.succeed(null)));
				questionMessage = fetchedMessage ?? null;
			}
		}

		if (!questionMessage) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Could not find the question message",
				}),
			);
			return;
		}

		if (questionMessage.id === targetMessage.id) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "You cannot mark the question as its own solution",
				}),
			);
			return;
		}

		const guild = targetMessage.guild;
		if (!guild) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Guild not found",
				}),
			);
			return;
		}

		const guildMember = yield* discord
			.callClient(() => guild.members.fetch(interaction.user.id))
			.pipe(Effect.catchAll(() => Effect.succeed(null)));

		if (!guildMember) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Could not fetch your member information",
				}),
			);
			return;
		}

		const isQuestionAuthor = questionMessage.author.id === interaction.user.id;
		const hasPermission =
			parentChannel.permissionsFor(guildMember)?.has("ManageThreads") ?? false;

		if (!isQuestionAuthor && !hasPermission) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content:
						"You must be the question author or have ManageThreads permission to mark a solution",
				}),
			);
			return;
		}

		const serverPreferencesLiveData =
			yield* database.private.server_preferences.getServerPreferencesByServerId(
				{
					serverId: server.discordId,
				},
			);
		const serverPreferences = serverPreferencesLiveData ?? null;
		const data = yield* discord.callClient(() =>
			toAOMessage(targetMessage, server.discordId),
		);

		yield* database.private.messages.upsertMessage({
			message: {
				id: data.id,
				authorId: data.authorId,
				serverId: data.serverId,
				channelId: data.channelId,
				parentChannelId: data.parentChannelId,
				childThreadId: data.childThreadId,
				questionId: data.questionId,
				referenceId: data.referenceId,
				applicationId: data.applicationId,
				interactionId: data.interactionId,
				webhookId: data.webhookId,
				content: data.content,
				flags: data.flags,
				type: data.type,
				pinned: data.pinned,
				nonce: data.nonce,
				tts: data.tts,
				embeds: data.embeds,
			},
			attachments: data.attachments,
			reactions: data.reactions,
			ignoreChecks: false,
		});

		yield* Effect.promise(async () => {
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
					yield* discord.callClient(() =>
						interaction.editReply({
							content: "An error occurred while marking the solution",
						}),
					);
					return yield* Effect.fail(error);
				}),
			),
		);

		if (!channelSettings || !channelSettings.flags) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Channel settings not found",
				}),
			);
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

		yield* discord.callClient(() =>
			interaction.editReply({
				embeds: [embed],
				components: components ? [components] : undefined,
			}),
		);
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
					yield* handleMarkSolutionCommand(interaction);
				}
				return;
			}),
		);
	}),
);
