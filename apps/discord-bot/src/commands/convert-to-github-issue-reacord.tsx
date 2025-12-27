import { Database } from "@packages/database/database";
import {
	ActionRow,
	Button,
	Embed,
	EmbedField,
	Link,
	Option,
	Reacord,
	Select,
	useInstance,
} from "@packages/reacord";
import type { ContextMenuCommandInteraction, Message } from "discord.js";
import {
	ActionRowBuilder,
	MessageFlags,
	ModalBuilder,
	TextInputBuilder,
	TextInputStyle,
} from "discord.js";
import { Data, Duration, Effect, Layer, Metric } from "effect";
import { useState } from "react";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import {
	catchAllDefectWithReport,
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

const COMMAND_NAME = "Create GitHub Issue";
const GITHUB_ISSUE_EDIT_MODAL = "github-issue-edit-modal";
const GITHUB_ISSUE_TITLE_INPUT = "github-issue-title";
const GITHUB_ISSUE_BODY_INPUT = "github-issue-body";

const GITHUB_APP_INSTALL_URL =
	process.env.GITHUB_APP_INSTALL_URL ??
	"https://github.com/apps/answer-overflow/installations/new";

class GitHubIssueTimeoutError extends Data.TaggedError(
	"GitHubIssueTimeoutError",
)<{
	readonly message: string;
	readonly guildId?: string;
	readonly channelId?: string;
	readonly userId?: string;
	readonly targetMessageId?: string;
}> {}

type GitHubRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: boolean;
	installationId: number;
};

function makeMainSiteLink(path: string): string {
	const baseUrl =
		process.env.NEXT_PUBLIC_BASE_URL || "https://www.answeroverflow.com";
	return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

type IssueBodyOptions = {
	message: Message;
	additionalContext?: string;
	indexingEnabled?: boolean;
	hasPaidPlan?: boolean;
};

function generateIssueBody({
	message,
	additionalContext,
	indexingEnabled,
	hasPaidPlan,
}: IssueBodyOptions): string {
	const authorMention = message.author.username;
	const discordLink = `https://discord.com/channels/${message.guildId}/${message.channelId}/${message.id}`;

	const quotedContent = message.content
		.split("\n")
		.map((line) => `> ${line}`)
		.join("\n");

	const viewLink = indexingEnabled
		? `[View on Answer Overflow](${makeMainSiteLink(`/m/${message.id}`)})`
		: `[View on Discord](${discordLink})`;

	const attribution = hasPaidPlan
		? ""
		: `\n\n---\n*Created by [Answer Overflow](https://answeroverflow.com/about)*`;

	const footer = `
---
📎 ${viewLink} | 👤 Posted by @${authorMention}${attribution}`;

	if (additionalContext) {
		return `${additionalContext}

---

**Original Discord Message:**

${quotedContent}
${footer}`;
	}

	return `${quotedContent}
${footer}`;
}

function generateIssueTitle(message: Message): string {
	const channel = message.channel;
	if (channel.isThread() && channel.name) {
		return channel.name.slice(0, 80);
	}

	const firstLine = message.content.split("\n")[0] ?? "";
	if (firstLine.length > 80) {
		return `${firstLine.slice(0, 77)}...`;
	}
	return firstLine || "Issue from Discord";
}

type GitHubIssueCreatorProps = {
	repos: GitHubRepo[];
	hasAllReposAccess: boolean;
	initialTitle: string;
	initialBody: string;
	originalMessageId: string;
	originalChannelId: string;
	originalGuildId: string;
	originalThreadId?: string;
	discordUserId: string;
};

type Status = "editing" | "creating" | "success" | "error";

function GitHubIssueCreator({
	repos,
	hasAllReposAccess,
	initialTitle,
	initialBody,
	originalMessageId,
	originalChannelId,
	originalGuildId,
	originalThreadId,
	discordUserId,
}: GitHubIssueCreatorProps) {
	const [selectedRepo, setSelectedRepo] = useState<{
		owner: string;
		name: string;
	} | null>(
		repos.length === 1
			? { owner: repos[0]!.owner, name: repos[0]!.name }
			: null,
	);
	const [title, setTitle] = useState(initialTitle);
	const [body, setBody] = useState(initialBody);
	const [status, setStatus] = useState<Status>("editing");
	const [issueUrl, setIssueUrl] = useState<string | null>(null);
	const [issueNumber, setIssueNumber] = useState<number | null>(null);
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const instance = useInstance();

	if (status === "success" && issueUrl && issueNumber && selectedRepo) {
		return (
			<Embed title="✅ GitHub Issue Created" color={0x238636} url={issueUrl}>
				<EmbedField name="Repository">
					{selectedRepo.owner}/{selectedRepo.name}
				</EmbedField>
				<EmbedField name="Issue">#{issueNumber}</EmbedField>
				<EmbedField name="Title">{title}</EmbedField>
			</Embed>
		);
	}

	if (status === "error") {
		return (
			<>
				<Embed title="❌ Failed to Create Issue" color={0xff0000}>
					{errorMessage ?? "An unknown error occurred"}
				</Embed>
				<ActionRow>
					<Button
						label="Try Again"
						style="primary"
						onClick={() => {
							setStatus("editing");
							setErrorMessage(null);
							return Effect.void;
						}}
					/>
					<Button
						label="Dismiss"
						style="danger"
						onClick={() => {
							instance.destroy();
							return Effect.void;
						}}
					/>
				</ActionRow>
			</>
		);
	}

	const INSTALL_MORE_REPOS_VALUE = "__install_more_repos__";

	return (
		<>
			<Embed title="📝 New GitHub Issue" color={0x238636}>
				<EmbedField name="Title">{title || "_No title_"}</EmbedField>
				<EmbedField name="Description Preview">
					{body.length > 200 ? `${body.slice(0, 197)}...` : body}
				</EmbedField>
				<EmbedField name="Repository" inline>
					{selectedRepo
						? `${selectedRepo.owner}/${selectedRepo.name}`
						: "_Select a repository_"}
				</EmbedField>
			</Embed>

			{repos.length > 0 && (
				<Select
					placeholder="Select a repository"
					value={
						selectedRepo
							? `${selectedRepo.owner}/${selectedRepo.name}`
							: undefined
					}
					onSelect={(value, interaction) => {
						if (value === INSTALL_MORE_REPOS_VALUE) {
							return Effect.tryPromise(() =>
								interaction.reply({
									content:
										"To add more repositories, install the Answer Overflow app:",
									components: [
										{
											type: 1,
											components: [
												{
													type: 2,
													style: 5,
													label: "Install Answer Overflow",
													url: GITHUB_APP_INSTALL_URL,
												},
											],
										},
									],
									flags: MessageFlags.Ephemeral,
								}),
							);
						}
						const [owner, name] = value.split("/");
						if (owner && name) {
							setSelectedRepo({ owner, name });
						}
						return Effect.void;
					}}
				>
					{repos.slice(0, 24).map((repo) => (
						<Option
							key={repo.fullName}
							value={repo.fullName}
							label={repo.fullName}
						/>
					))}
					{!hasAllReposAccess && (
						<Option
							value={INSTALL_MORE_REPOS_VALUE}
							label="➕ Install on more repos..."
						/>
					)}
				</Select>
			)}

			<ActionRow>
				<Button
					label="Edit"
					onClick={(interaction) =>
						Effect.gen(function* () {
							const modal = new ModalBuilder()
								.setCustomId(
									`${GITHUB_ISSUE_EDIT_MODAL}:${originalMessageId}:${discordUserId}`,
								)
								.setTitle("Edit GitHub Issue")
								.addComponents(
									new ActionRowBuilder<TextInputBuilder>().addComponents(
										new TextInputBuilder()
											.setCustomId(GITHUB_ISSUE_TITLE_INPUT)
											.setLabel("Issue Title")
											.setStyle(TextInputStyle.Short)
											.setValue(title)
											.setMaxLength(256)
											.setRequired(true),
									),
									new ActionRowBuilder<TextInputBuilder>().addComponents(
										new TextInputBuilder()
											.setCustomId(GITHUB_ISSUE_BODY_INPUT)
											.setLabel("Issue Body")
											.setStyle(TextInputStyle.Paragraph)
											.setValue(body)
											.setMaxLength(4000)
											.setRequired(true),
									),
								);

							yield* Effect.tryPromise(() => interaction.showModal(modal));

							const submitted = yield* Effect.tryPromise(() =>
								interaction.awaitModalSubmit({
									time: 5 * 60 * 1000,
									filter: (i) =>
										i.customId ===
										`${GITHUB_ISSUE_EDIT_MODAL}:${originalMessageId}:${discordUserId}`,
								}),
							);

							const newTitle = submitted.fields.getTextInputValue(
								GITHUB_ISSUE_TITLE_INPUT,
							);
							const newBody = submitted.fields.getTextInputValue(
								GITHUB_ISSUE_BODY_INPUT,
							);

							setTitle(newTitle);
							setBody(newBody);

							yield* Effect.tryPromise(() => submitted.deferUpdate());
						})
					}
				/>
				<Button
					label={status === "creating" ? "Creating..." : "Create Issue"}
					style="success"
					disabled={!selectedRepo || status === "creating"}
					onClick={() =>
						Effect.gen(function* () {
							if (!selectedRepo) return;

							setStatus("creating");

							const database = yield* Database;

							const result = yield* database.private.github
								.createGitHubIssueFromDiscord({
									discordId: BigInt(discordUserId),
									repoOwner: selectedRepo.owner,
									repoName: selectedRepo.name,
									title,
									body,
									discordServerId: BigInt(originalGuildId),
									discordChannelId: BigInt(originalChannelId),
									discordMessageId: BigInt(originalMessageId),
									discordThreadId: originalThreadId
										? BigInt(originalThreadId)
										: undefined,
								})
								.pipe(Effect.withSpan("create_github_issue_api_call"));

							if (!result.success) {
								if (
									result.code === "NOT_LINKED" ||
									result.code === "REFRESH_REQUIRED" ||
									result.code === "REFRESH_FAILED"
								) {
									setErrorMessage(
										`Your GitHub session has expired. Please re-link your account at ${makeMainSiteLink("/dashboard/settings")}`,
									);
								} else {
									setErrorMessage(result.error);
								}
								setStatus("error");
								return;
							}

							setIssueUrl(result.issue.url);
							setIssueNumber(result.issue.number);
							setStatus("success");
						})
					}
				/>
				<Button
					label="Dismiss"
					style="danger"
					onClick={() => {
						instance.destroy();
						return Effect.void;
					}}
				/>
			</ActionRow>

			{!hasAllReposAccess && repos.length > 0 && (
				<ActionRow>
					<Link label="➕ Install on more repos" url={GITHUB_APP_INSTALL_URL} />
				</ActionRow>
			)}
		</>
	);
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

	const discord = yield* Discord;
	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	const database = yield* Database;
	const reacord = yield* Reacord;

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

	yield* reacord.reply(
		interaction,
		<GitHubIssueCreator
			repos={reposResult.repos}
			hasAllReposAccess={reposResult.hasAllReposAccess}
			initialTitle={generateIssueTitle(targetMessage)}
			initialBody={generateIssueBody({
				message: targetMessage,
				indexingEnabled,
				hasPaidPlan,
			})}
			originalMessageId={targetMessage.id}
			originalChannelId={targetMessage.channelId}
			originalGuildId={targetMessage.guildId ?? ""}
			originalThreadId={threadId}
			discordUserId={interaction.user.id}
		/>,
	);
});

export const ConvertToGitHubIssueReacordLayer = Layer.scopedDiscard(
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
				}
			}),
		);
	}),
);
