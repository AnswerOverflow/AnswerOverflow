import { Database } from "@packages/database/database";
import type {
	ButtonInteraction,
	ContextMenuCommandInteraction,
	ModalSubmitInteraction,
	StringSelectMenuInteraction,
} from "discord.js";
import {
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
	MessageFlags,
	ModalBuilder,
	StringSelectMenuBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Duration, Effect, Layer, Metric } from "effect";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import {
	catchAllDefectWithReport,
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";
import {
	generateIssueBody,
	generateIssueTitle,
	GITHUB_APP_INSTALL_URL,
	type GitHubRepo,
	GitHubIssueTimeoutError,
	INSTALL_MORE_REPOS_VALUE,
	makeMainSiteLink,
} from "./github-issue-utils";

const COMMAND_NAME = "Create GitHub Issue";
const GITHUB_ISSUE_BUTTON_PREFIX = "github-issue-";
const GITHUB_ISSUE_REPO_SELECT = "github-issue-repo-select";
const GITHUB_ISSUE_EDIT_MODAL = "github-issue-edit-modal";
const GITHUB_ISSUE_TITLE_INPUT = "github-issue-title";
const GITHUB_ISSUE_BODY_INPUT = "github-issue-body";

type IssueState = {
	title: string;
	body: string;
	selectedRepo: { owner: string; name: string } | null;
	originalMessageId: string;
	originalChannelId: string;
	originalGuildId: string;
	originalThreadId?: string;
	discordUserId: string;
	repos: Array<GitHubRepo>;
	hasAllReposAccess: boolean;
};

const issueStateCache = new Map<string, IssueState>();

function buildIssueEmbed(state: IssueState): EmbedBuilder {
	const embed = new EmbedBuilder()
		.setTitle("📝 New GitHub Issue")
		.setColor(0x238636)
		.addFields(
			{ name: "Title", value: state.title || "_No title_", inline: false },
			{
				name: "Description Preview",
				value:
					state.body.length > 200
						? `${state.body.slice(0, 197)}...`
						: state.body,
				inline: false,
			},
			{
				name: "Repository",
				value: state.selectedRepo
					? `${state.selectedRepo.owner}/${state.selectedRepo.name}`
					: "_Select a repository_",
				inline: true,
			},
		);

	return embed;
}

function buildIssueComponents(
	state: IssueState,
	messageId: string,
): ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] {
	const rows: ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>[] = [];

	if (state.repos.length > 0) {
		const repoOptions = state.repos.slice(0, 24).map((repo) => ({
			label: repo.fullName,
			value: repo.fullName,
			default:
				state.selectedRepo?.owner === repo.owner &&
				state.selectedRepo?.name === repo.name,
		}));

		if (!state.hasAllReposAccess) {
			repoOptions.push({
				label: "➕ Install on more repos...",
				value: INSTALL_MORE_REPOS_VALUE,
				default: false,
			});
		}

		const selectMenu = new StringSelectMenuBuilder()
			.setCustomId(`${GITHUB_ISSUE_REPO_SELECT}:${messageId}`)
			.setPlaceholder("Select a repository")
			.addOptions(repoOptions);

		rows.push(
			new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(selectMenu),
		);
	}

	const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
		new ButtonBuilder()
			.setCustomId(`${GITHUB_ISSUE_BUTTON_PREFIX}edit:${messageId}`)
			.setLabel("Edit")
			.setStyle(ButtonStyle.Secondary),
		new ButtonBuilder()
			.setCustomId(`${GITHUB_ISSUE_BUTTON_PREFIX}create:${messageId}`)
			.setLabel("Create Issue")
			.setStyle(ButtonStyle.Success)
			.setDisabled(!state.selectedRepo),
		new ButtonBuilder()
			.setCustomId(`${GITHUB_ISSUE_BUTTON_PREFIX}dismiss:${messageId}`)
			.setLabel("Dismiss")
			.setStyle(ButtonStyle.Danger),
	);

	rows.push(buttonRow);

	return rows;
}

export const handleConvertToGitHubIssueCommand = Effect.fn(
	"convert_to_github_issue_command",
)(function* (interaction: ContextMenuCommandInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.user_id": interaction.user.id,
		"discord.target_message_id": interaction.targetId,
	});
	yield* Metric.increment(commandExecuted("convert_to_github_issue"));

	const database = yield* Database;
	const discord = yield* Discord;

	yield* discord
		.callClient(() => interaction.deferReply({ flags: MessageFlags.Ephemeral }))
		.pipe(Effect.withSpan("defer_reply"));

	const reposResult = yield* database.private.github
		.getAccessibleReposByDiscordId({
			discordId: BigInt(interaction.user.id),
		})
		.pipe(Effect.withSpan("get_accessible_repos"));

	if (!reposResult.success) {
		const settingsUrl = makeMainSiteLink("/dashboard/settings");

		if (reposResult.code === "NOT_LINKED") {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: `You need to link your GitHub account first.\n\n👉 [Link GitHub Account](${settingsUrl})`,
				}),
			);
			return;
		}

		if (
			reposResult.code === "REFRESH_REQUIRED" ||
			reposResult.code === "REFRESH_FAILED"
		) {
			yield* discord.callClient(() =>
				interaction.editReply({
					content: `Your GitHub session has expired. Please re-link your account.\n\n👉 [Re-link GitHub Account](${settingsUrl})`,
				}),
			);
			return;
		}

		yield* discord.callClient(() =>
			interaction.editReply({
				content: `Failed to fetch your GitHub repositories: ${reposResult.error}`,
			}),
		);
		return;
	}

	if (reposResult.repos.length === 0) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: `The Answer Overflow app is not installed on any of your repositories.\n\n👉 [Install Answer Overflow](${GITHUB_APP_INSTALL_URL})`,
			}),
		);
		return;
	}

	const targetMessage = yield* discord
		.callClient(() => interaction.channel?.messages.fetch(interaction.targetId))
		.pipe(Effect.withSpan("fetch_target_message"));

	if (!targetMessage) {
		yield* discord.callClient(() =>
			interaction.editReply({
				content: "Failed to fetch the target message",
			}),
		);
		return;
	}

	const channel = targetMessage.channel;
	const threadId = channel.isThread() ? channel.id : undefined;
	const parentChannelId = channel.isThread()
		? channel.parentId
		: targetMessage.channelId;

	const channelSettings = parentChannelId
		? yield* database.private.channels
				.findChannelByDiscordId({
					discordId: BigInt(parentChannelId),
				})
				.pipe(Effect.withSpan("get_channel_settings"))
		: null;

	const serverPreferences =
		targetMessage.guildId && channelSettings
			? yield* database.private.server_preferences
					.getServerPreferencesByServerId({
						serverId: BigInt(targetMessage.guildId),
					})
					.pipe(Effect.withSpan("get_server_preferences"))
			: null;

	const indexingEnabled = channelSettings?.flags?.indexingEnabled ?? false;
	const hasPaidPlan = Boolean(serverPreferences?.customDomain);

	const state: IssueState = {
		title: generateIssueTitle(targetMessage),
		body: generateIssueBody({
			message: targetMessage,
			indexingEnabled,
			hasPaidPlan,
		}),
		selectedRepo:
			reposResult.repos.length === 1
				? {
						owner: reposResult.repos[0]!.owner,
						name: reposResult.repos[0]!.name,
					}
				: null,
		originalMessageId: targetMessage.id,
		originalChannelId: targetMessage.channelId,
		originalGuildId: targetMessage.guildId ?? "",
		originalThreadId: threadId,
		discordUserId: interaction.user.id,
		repos: reposResult.repos,
		hasAllReposAccess: reposResult.hasAllReposAccess,
	};

	const cacheKey = `${interaction.user.id}:${targetMessage.id}`;
	issueStateCache.set(cacheKey, state);

	setTimeout(
		() => {
			issueStateCache.delete(cacheKey);
		},
		15 * 60 * 1000,
	);

	const embed = buildIssueEmbed(state);
	const components = buildIssueComponents(state, targetMessage.id);

	yield* discord.callClient(() =>
		interaction.editReply({
			embeds: [embed],
			components,
		}),
	);
});

export const handleRepoSelectInteraction = Effect.fn(
	"github_issue_repo_select",
)(function* (interaction: StringSelectMenuInteraction) {
	const discord = yield* Discord;

	const [, messageId] = interaction.customId.split(":");
	if (!messageId) return;

	const cacheKey = `${interaction.user.id}:${messageId}`;
	const state = issueStateCache.get(cacheKey);

	if (!state) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This interaction has expired. Please start over.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const selectedValue = interaction.values[0];
	if (!selectedValue) return;

	if (selectedValue === INSTALL_MORE_REPOS_VALUE) {
		const installButton = new ButtonBuilder()
			.setLabel("Install Answer Overflow")
			.setStyle(ButtonStyle.Link)
			.setURL(GITHUB_APP_INSTALL_URL);

		const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
			installButton,
		);

		yield* discord.callClient(() =>
			interaction.reply({
				content: "To add more repositories, install the Answer Overflow app:",
				components: [row],
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const [owner, name] = selectedValue.split("/");
	if (!owner || !name) return;

	state.selectedRepo = { owner, name };

	const embed = buildIssueEmbed(state);
	const components = buildIssueComponents(state, messageId);

	yield* discord.callClient(() =>
		interaction.update({
			embeds: [embed],
			components,
		}),
	);
});

export const handleEditButtonInteraction = Effect.fn(
	"github_issue_edit_button",
)(function* (interaction: ButtonInteraction) {
	const discord = yield* Discord;

	const [, messageId] = interaction.customId.split(":");
	if (!messageId) return;

	const cacheKey = `${interaction.user.id}:${messageId}`;
	const state = issueStateCache.get(cacheKey);

	if (!state) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This interaction has expired. Please start over.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	const modal = new ModalBuilder()
		.setCustomId(`${GITHUB_ISSUE_EDIT_MODAL}:${messageId}`)
		.setTitle("Edit GitHub Issue")
		.addComponents(
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId(GITHUB_ISSUE_TITLE_INPUT)
					.setLabel("Issue Title")
					.setStyle(TextInputStyle.Short)
					.setValue(state.title)
					.setMaxLength(256)
					.setRequired(true),
			),
			new ActionRowBuilder<TextInputBuilder>().addComponents(
				new TextInputBuilder()
					.setCustomId(GITHUB_ISSUE_BODY_INPUT)
					.setLabel("Issue Body")
					.setStyle(TextInputStyle.Paragraph)
					.setValue(state.body)
					.setMaxLength(4000)
					.setRequired(true),
			),
		);

	yield* discord.callClient(() => interaction.showModal(modal));
});

export const handleEditModalSubmit = Effect.fn(
	"github_issue_edit_modal_submit",
)(function* (interaction: ModalSubmitInteraction) {
	const discord = yield* Discord;

	const [, messageId] = interaction.customId.split(":");
	if (!messageId) return;

	const cacheKey = `${interaction.user.id}:${messageId}`;
	const state = issueStateCache.get(cacheKey);

	if (!state) {
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This interaction has expired. Please start over.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	state.title = interaction.fields.getTextInputValue(GITHUB_ISSUE_TITLE_INPUT);
	state.body = interaction.fields.getTextInputValue(GITHUB_ISSUE_BODY_INPUT);

	yield* discord.callClient(() => interaction.deferUpdate());

	const embed = buildIssueEmbed(state);
	const components = buildIssueComponents(state, messageId);

	yield* discord.callClient(() =>
		interaction.editReply({
			embeds: [embed],
			components,
		}),
	);
});

export const handleCreateButtonInteraction = Effect.fn(
	"github_issue_create_button",
)(function* (interaction: ButtonInteraction) {
	yield* Effect.annotateCurrentSpan({
		"discord.user_id": interaction.user.id,
		"discord.guild_id": interaction.guildId ?? "unknown",
		"discord.channel_id": interaction.channelId ?? "unknown",
		"discord.custom_id": interaction.customId,
	});

	const database = yield* Database;
	const discord = yield* Discord;

	const [, messageId] = interaction.customId.split(":");
	if (!messageId) {
		yield* Effect.annotateCurrentSpan({ "error.reason": "no_message_id" });
		yield* Effect.logWarning("No message ID in custom ID");
		return;
	}

	yield* Effect.annotateCurrentSpan({ "github.target_message_id": messageId });

	const cacheKey = `${interaction.user.id}:${messageId}`;
	const state = issueStateCache.get(cacheKey);

	if (!state) {
		yield* Effect.annotateCurrentSpan({ "error.reason": "state_not_found" });
		yield* Effect.logWarning("Issue state not found in cache");
		yield* discord.callClient(() =>
			interaction.reply({
				content: "This interaction has expired. Please start over.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	yield* Effect.annotateCurrentSpan({
		"github.selected_repo": state.selectedRepo
			? `${state.selectedRepo.owner}/${state.selectedRepo.name}`
			: "none",
		"github.original_message_id": state.originalMessageId,
		"github.original_channel_id": state.originalChannelId,
		"github.original_guild_id": state.originalGuildId,
	});

	if (!state.selectedRepo) {
		yield* Effect.annotateCurrentSpan({ "error.reason": "no_repo_selected" });
		yield* discord.callClient(() =>
			interaction.reply({
				content: "Please select a repository first.",
				flags: MessageFlags.Ephemeral,
			}),
		);
		return;
	}

	yield* discord
		.callClient(() => interaction.deferUpdate())
		.pipe(Effect.withSpan("defer_update"));

	yield* Effect.logInfo("Creating GitHub issue", {
		repo: `${state.selectedRepo.owner}/${state.selectedRepo.name}`,
		title: state.title,
	});

	const result = yield* database.private.github
		.createGitHubIssueFromDiscord({
			discordId: BigInt(interaction.user.id),
			repoOwner: state.selectedRepo.owner,
			repoName: state.selectedRepo.name,
			title: state.title,
			body: state.body,
			discordServerId: BigInt(state.originalGuildId),
			discordChannelId: BigInt(state.originalChannelId),
			discordMessageId: BigInt(state.originalMessageId),
			discordThreadId: state.originalThreadId
				? BigInt(state.originalThreadId)
				: undefined,
		})
		.pipe(Effect.withSpan("create_github_issue_api_call"));

	if (!result.success) {
		yield* Effect.annotateCurrentSpan({
			"error.reason": "api_call_failed",
			"error.code": result.code,
			"error.message": result.error,
		});
		yield* Effect.logError("Failed to create GitHub issue", {
			code: result.code,
			error: result.error,
		});

		if (
			result.code === "NOT_LINKED" ||
			result.code === "REFRESH_REQUIRED" ||
			result.code === "REFRESH_FAILED"
		) {
			const settingsUrl = makeMainSiteLink("/dashboard/settings");
			yield* discord.callClient(() =>
				interaction.editReply({
					content: `Your GitHub session has expired. Please re-link your account.\n\n👉 [Re-link GitHub Account](${settingsUrl})`,
					embeds: [],
					components: [],
				}),
			);
			return;
		}

		yield* discord.callClient(() =>
			interaction.editReply({
				content: `Failed to create the GitHub issue: ${result.error}`,
				embeds: [],
				components: [],
			}),
		);
		return;
	}

	yield* Effect.annotateCurrentSpan({
		"github.issue_number": result.issue.number,
		"github.issue_url": result.issue.url,
	});
	yield* Effect.logInfo("GitHub issue created successfully", {
		issueNumber: result.issue.number,
		issueUrl: result.issue.url,
	});

	issueStateCache.delete(cacheKey);

	const successEmbed = new EmbedBuilder()
		.setTitle("✅ GitHub Issue Created")
		.setColor(0x238636)
		.setDescription(
			`Successfully created issue #${result.issue.number} in ${state.selectedRepo.owner}/${state.selectedRepo.name}`,
		)
		.addFields({ name: "Title", value: state.title, inline: false })
		.setURL(result.issue.url);

	yield* discord.callClient(() =>
		interaction.editReply({
			embeds: [successEmbed],
			components: [],
		}),
	);
});

export const handleDismissButtonInteraction = Effect.fn(
	"github_issue_dismiss_button",
)(function* (interaction: ButtonInteraction) {
	const discord = yield* Discord;

	const [, messageId] = interaction.customId.split(":");
	if (!messageId) return;

	const cacheKey = `${interaction.user.id}:${messageId}`;
	issueStateCache.delete(cacheKey);

	yield* discord.callClient(() =>
		interaction.update({
			content: "Dismissed.",
			embeds: [],
			components: [],
		}),
	);
});

export const ConvertToGitHubIssueCommandHandlerLayer = Layer.scopedDiscard(
	Effect.gen(function* () {
		const discord = yield* Discord;

		yield* discord.client.on("interactionCreate", (interaction) =>
			Effect.gen(function* () {
				if (
					interaction.isContextMenuCommand() &&
					interaction.commandName === COMMAND_NAME
				) {
					const commandWithTimeout = handleConvertToGitHubIssueCommand(
						interaction,
					).pipe(
						Effect.timeoutFail({
							duration: Duration.seconds(25),
							onTimeout: () =>
								new GitHubIssueTimeoutError({
									message:
										"Convert to GitHub issue command timed out after 25 seconds",
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
								console.error("Convert to GitHub issue command failed:", error);

								if (interaction.deferred || interaction.replied) {
									yield* catchAllSilentWithReport(
										discord.callClient(() =>
											interaction.editReply({
												content:
													"An error occurred while processing your request.",
											}),
										),
									);
								} else {
									yield* catchAllSilentWithReport(
										discord.callClient(() =>
											interaction.reply({
												content:
													"An error occurred while processing your request.",
												flags: MessageFlags.Ephemeral,
											}),
										),
									);
								}
							}),
						),
						catchAllDefectWithReport((defect) =>
							Effect.gen(function* () {
								console.error(
									"Convert to GitHub issue command defect:",
									defect,
								);

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
					return;
				}

				if (
					interaction.isStringSelectMenu() &&
					interaction.customId.startsWith(GITHUB_ISSUE_REPO_SELECT)
				) {
					yield* handleRepoSelectInteraction(interaction).pipe(
						catchAllWithReport((error) =>
							Effect.gen(function* () {
								console.error("Repo select interaction failed:", error);
								yield* catchAllSilentWithReport(
									discord.callClient(() =>
										interaction.reply({
											content: "An error occurred.",
											flags: MessageFlags.Ephemeral,
										}),
									),
								);
							}),
						),
					);
					return;
				}

				if (
					interaction.isButton() &&
					interaction.customId.startsWith(
						`${GITHUB_ISSUE_BUTTON_PREFIX}dismiss:`,
					)
				) {
					yield* handleDismissButtonInteraction(interaction).pipe(
						catchAllWithReport((error) =>
							Effect.sync(() => {
								console.error("Dismiss button interaction failed:", error);
							}),
						),
					);
					return;
				}

				if (
					interaction.isButton() &&
					interaction.customId.startsWith(
						`${GITHUB_ISSUE_BUTTON_PREFIX}create:`,
					)
				) {
					yield* handleCreateButtonInteraction(interaction).pipe(
						catchAllWithReport((error) =>
							Effect.gen(function* () {
								console.error("Create button interaction failed:", error);
								yield* catchAllSilentWithReport(
									discord.callClient(() =>
										interaction.editReply({
											content:
												"Failed to create the GitHub issue. Please try again.",
											embeds: [],
											components: [],
										}),
									),
								);
							}),
						),
					);
					return;
				}

				if (
					interaction.isButton() &&
					interaction.customId.startsWith(`${GITHUB_ISSUE_BUTTON_PREFIX}edit:`)
				) {
					yield* handleEditButtonInteraction(interaction).pipe(
						catchAllWithReport((error) =>
							Effect.gen(function* () {
								console.error("Edit button interaction failed:", error);
								yield* catchAllSilentWithReport(
									discord.callClient(() =>
										interaction.reply({
											content: "An error occurred.",
											flags: MessageFlags.Ephemeral,
										}),
									),
								);
							}),
						),
					);
					return;
				}

				if (
					interaction.isModalSubmit() &&
					interaction.customId.startsWith(GITHUB_ISSUE_EDIT_MODAL)
				) {
					yield* handleEditModalSubmit(interaction).pipe(
						catchAllWithReport((error) =>
							Effect.gen(function* () {
								console.error("Edit modal submit failed:", error);
								yield* catchAllSilentWithReport(
									discord.callClient(() =>
										interaction.reply({
											content: "An error occurred.",
											flags: MessageFlags.Ephemeral,
										}),
									),
								);
							}),
						),
					);
					return;
				}
			}),
		);
	}),
);
