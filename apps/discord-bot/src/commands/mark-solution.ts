import { Database } from "@packages/database/database";
import type { ContextMenuCommandInteraction } from "discord.js";
import { ChannelType, MessageFlags } from "discord.js";
import { Data, Duration, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { commandExecuted, solutionsMarked } from "../metrics";
import { makeMarkSolutionResponse } from "../services/mark-solution";
import {
	trackMarkSolutionCommandUsed,
	trackSolvedQuestion,
} from "../utils/analytics";
import { toAOMessage, toUpsertMessageArgs } from "../utils/conversions";
import {
	catchAllDefectWithReport,
	catchAllSilentWithReport,
	catchAllSucceedNullWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

class MarkSolutionTimeoutError extends Data.TaggedError(
	"MarkSolutionTimeoutError",
)<{
	readonly message: string;
	readonly guildId?: string;
	readonly channelId?: string;
	readonly userId?: string;
	readonly targetMessageId?: string;
}> {}

class MarkSolutionResponseBuildError extends Data.TaggedError(
	"MarkSolutionResponseBuildError",
)<{
	readonly cause: unknown;
}> {}

export const handleMarkSolutionCommand = Effect.fn("mark_solution_command")(
	function* (interaction: ContextMenuCommandInteraction) {
		yield* Effect.annotateCurrentSpan({
			"discord.guild_id": interaction.guildId ?? "unknown",
			"discord.channel_id": interaction.channelId ?? "unknown",
			"discord.user_id": interaction.user.id,
			"discord.target_message_id": interaction.targetId,
		});
		yield* Metric.increment(commandExecuted("mark_solution"));

		const database = yield* Database;
		const discord = yield* Discord;

		yield* discord
			.callClient(() =>
				interaction.deferReply({ flags: MessageFlags.Ephemeral }),
			)
			.pipe(Effect.withSpan("defer_reply"));

		if (!interaction.channel) {
			yield* discord.callClient(() =>
				interaction.editReply({ content: "Channel not found" }),
			);
			return;
		}

		const targetMessage = yield* discord
			.callClient(() =>
				interaction.channel?.messages.fetch(interaction.targetId),
			)
			.pipe(Effect.withSpan("fetch_target_message"));
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

		const server = yield* database.private.servers
			.getServerByDiscordId({
				discordId: BigInt(targetMessage.guildId),
			})
			.pipe(Effect.withSpan("get_server"));

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

		const channelSettings = yield* database.private.channels
			.findChannelByDiscordId({
				discordId: BigInt(parentChannel.id),
			})
			.pipe(Effect.withSpan("get_channel_settings"));

		if (!channelSettings || !channelSettings.flags?.markSolutionEnabled) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Mark solution is not enabled for this channel",
				}),
			);
			return;
		}

		let questionMessage = null;

		if (parentChannel.type === ChannelType.GuildForum) {
			const fetchedMessage = yield* catchAllSucceedNullWithReport(
				discord
					.callClient(() => thread.messages.fetch(thread.id))
					.pipe(Effect.withSpan("fetch_forum_question_message")),
			);
			questionMessage = fetchedMessage ?? null;
		} else if (
			parentChannel.type === ChannelType.GuildText ||
			parentChannel.type === ChannelType.GuildAnnouncement
		) {
			const fetchedMessage = yield* catchAllSucceedNullWithReport(
				discord
					.callClient(() => parentChannel.messages.fetch(thread.id))
					.pipe(Effect.withSpan("fetch_text_question_message")),
			);
			questionMessage = fetchedMessage ?? null;
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

		const guildMember = yield* catchAllSucceedNullWithReport(
			discord
				.callClient(() => guild.members.fetch(interaction.user.id))
				.pipe(Effect.withSpan("fetch_guild_member")),
		);

		if (!guildMember) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Could not fetch your member information",
				}),
			);
			return;
		}

		const isQuestionAuthor = questionMessage.author.id === interaction.user.id;
		const memberPermissions = parentChannel.permissionsFor(guildMember);
		const hasPermission =
			memberPermissions?.has("ManageThreads") ||
			memberPermissions?.has("ManageChannels") ||
			memberPermissions?.has("ManageGuild") ||
			memberPermissions?.has("Administrator") ||
			false;

		const VALORANT_ROLE_ID = "684140826762149923";
		const hasSpecialRole = guildMember.roles.cache.has(VALORANT_ROLE_ID);

		if (!isQuestionAuthor && !hasPermission && !hasSpecialRole) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content:
						"You must be the question author or have ManageThreads, ManageChannels, ManageGuild, or Administrator permission to mark a solution",
				}),
			);
			return;
		}

		const serverPreferencesLiveData = yield* database.private.server_preferences
			.getServerPreferencesByServerId({
				serverId: server.discordId,
			})
			.pipe(Effect.withSpan("get_server_preferences"));

		const serverPreferences = serverPreferencesLiveData ?? null;

		const data = yield* discord
			.callClient(() => toAOMessage(targetMessage, server.discordId.toString()))
			.pipe(Effect.withSpan("convert_message"));

		yield* database.private.messages
			.upsertMessage({
				...toUpsertMessageArgs(data),
				ignoreChecks: false,
			})
			.pipe(Effect.withSpan("upsert_message"));

		yield* database.private.messages
			.markMessageAsSolution({
				solutionMessageId: BigInt(targetMessage.id),
				questionMessageId: BigInt(questionMessage.id),
			})
			.pipe(Effect.withSpan("mark_as_solution"));

		yield* Metric.increment(solutionsMarked);

		if (!channelSettings.flags) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: "Channel settings not found",
				}),
			);
			return;
		}

		const { embed, components } = yield* Effect.try({
			try: () =>
				makeMarkSolutionResponse({
					solution: targetMessage,
					server: {
						name: server.name,
						_id: server._id,
					},
					serverPreferences: serverPreferences ?? null,
					channelSettings: {
						...channelSettings,
						flags: channelSettings.flags,
					},
				}),
			catch: (cause) => new MarkSolutionResponseBuildError({ cause }),
		}).pipe(Effect.withSpan("build_response"));

		yield* discord
			.callClient(() => interaction.deleteReply())
			.pipe(Effect.withSpan("delete_reply"));
		yield* discord
			.callClient(() =>
				interaction.followUp({
					embeds: [embed],
					components: components ? [components] : undefined,
				}),
			)
			.pipe(Effect.withSpan("send_followup"));

		yield* Effect.forkDaemon(
			Effect.gen(function* () {
				const solutionTagId = channelSettings?.flags?.solutionTagId;
				const PUBG_MOBILE_SERVER_ID = "393088095840370689";

				if (thread.guildId === PUBG_MOBILE_SERVER_ID && solutionTagId) {
					yield* catchAllSilentWithReport(
						discord.callClient(() =>
							thread.setAppliedTags([solutionTagId.toString()]),
						),
					);
				} else if (
					parentChannel.type === ChannelType.GuildForum &&
					solutionTagId &&
					thread.appliedTags.length < 5 &&
					!thread.appliedTags.includes(solutionTagId.toString())
				) {
					yield* catchAllSilentWithReport(
						discord.callClient(() =>
							thread.setAppliedTags([
								...thread.appliedTags,
								solutionTagId.toString(),
							]),
						),
					);
				} else {
					yield* catchAllSilentWithReport(
						discord.callClient(() => questionMessage.react("✅")),
					);
				}

				yield* catchAllSilentWithReport(
					discord.callClient(() => targetMessage.react("✅")),
				);

				const [questionAsker, solutionAuthor] = yield* Effect.all([
					catchAllSucceedNullWithReport(
						discord.callClient(() =>
							guild.members.fetch(questionMessage.author.id),
						),
					),
					catchAllSucceedNullWithReport(
						discord.callClient(() =>
							guild.members.fetch(targetMessage.author.id),
						),
					),
				]);

				if (questionAsker && solutionAuthor) {
					yield* catchAllSilentWithReport(
						trackSolvedQuestion(
							thread,
							channelSettings,
							questionAsker,
							solutionAuthor,
							guildMember,
							questionMessage,
							targetMessage,
							{
								discordId: server.discordId.toString(),
								name: server.name,
							},
							serverPreferences
								? {
										readTheRulesConsentEnabled:
											serverPreferences.readTheRulesConsentEnabled,
									}
								: undefined,
						),
					);
				}

				yield* catchAllSilentWithReport(
					trackMarkSolutionCommandUsed(guildMember, "Success"),
				);
			}).pipe(Effect.withSpan("post_response_tasks")),
		);
	},
);

export const MarkSolutionCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isContextMenuCommand() &&
					interaction.commandName === "✅ Mark Solution"
				) {
					const commandWithTimeout = handleMarkSolutionCommand(
						interaction,
					).pipe(
						Effect.timeoutFail({
							duration: Duration.seconds(25),
							onTimeout: () =>
								new MarkSolutionTimeoutError({
									message: "Mark solution command timed out after 25 seconds",
									guildId: interaction.guildId ?? undefined,
									channelId: interaction.channelId ?? undefined,
									userId: interaction.user.id,
									targetMessageId: interaction.targetId,
								}),
						}),
					);

					yield* commandWithTimeout.pipe(
						catchAllWithReport((error) =>
							Effect.gen(function* () {
								console.error("Mark solution command failed:", error);

								const errorMessage = "An unexpected error occurred";

								if (interaction.deferred || interaction.replied) {
									yield* catchAllSilentWithReport(
										discord.callClient(() =>
											interaction.editReply({
												content: `An error occurred: ${errorMessage}`,
											}),
										),
									);
								} else {
									yield* catchAllSilentWithReport(
										discord.callClient(() =>
											interaction.reply({
												content: `An error occurred: ${errorMessage}`,
												flags: MessageFlags.Ephemeral,
											}),
										),
									);
								}
							}),
						),
						catchAllDefectWithReport((defect) =>
							Effect.gen(function* () {
								console.error("Mark solution command defect:", defect);

								if (interaction.deferred || interaction.replied) {
									yield* catchAllSilentWithReport(
										discord.callClient(() =>
											interaction.editReply({
												content:
													"An unexpected error occurred. Please try again.",
											}),
										),
									);
								} else {
									yield* catchAllSilentWithReport(
										discord.callClient(() =>
											interaction.reply({
												content:
													"An unexpected error occurred. Please try again.",
												flags: MessageFlags.Ephemeral,
											}),
										),
									);
								}
							}),
						),
					);
				}
				return;
			}),
		);
	}),
);
