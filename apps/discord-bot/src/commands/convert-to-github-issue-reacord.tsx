import { Database, DatabaseLayer } from "@packages/database/database";
import {
	ActionRow,
	Atom,
	Button,
	Embed,
	EmbedField,
	LoadingSelect,
	ModalButton,
	Option,
	Reacord,
	Result,
	Select,
	useAtomSet,
	useAtomValue,
	useInstance,
} from "@packages/reacord";
import type { ContextMenuCommandInteraction, Message } from "discord.js";
import { MessageFlags } from "discord.js";
import { Data, Duration, Effect, Layer, Metric } from "effect";
import { useState } from "react";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import {
	catchAllDefectWithReport,
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";

const databaseRuntime = Atom.runtime(DatabaseLayer);

const COMMAND_NAME = "Create GitHub Issue";
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

const INSTALL_MORE_REPOS_VALUE = "__install_more_repos__";

const reposAtomFamily = Atom.family((discordUserId: string) =>
	databaseRuntime.atom(
		Effect.gen(function* () {
			const database = yield* Database;
			const reposResult = yield* database.private.github
				.getAccessibleReposByDiscordId({
					discordId: BigInt(discordUserId),
				})
				.pipe(Effect.withSpan("get_accessible_repos_suspense"));

			if (!reposResult.success) {
				return { repos: [] as GitHubRepo[], hasAllReposAccess: false };
			}

			return {
				repos: reposResult.repos,
				hasAllReposAccess: reposResult.hasAllReposAccess,
			};
		}),
	),
);

type RepoSelectorProps = {
	discordUserId: string;
	selectedRepo: { owner: string; name: string } | null;
	setSelectedRepo: (repo: { owner: string; name: string } | null) => void;
};

function RepoSelector({
	discordUserId,
	selectedRepo,
	setSelectedRepo,
}: RepoSelectorProps) {
	const state = useAtomValue(reposAtomFamily(discordUserId));

	if (Result.isInitial(state) || state.waiting) {
		return <LoadingSelect placeholder="Loading repositories..." />;
	}

	if (Result.isFailure(state)) {
		return null;
	}

	const { repos, hasAllReposAccess } = state.value;

	if (repos.length === 0) {
		return null;
	}

	return (
		<Select
			placeholder="Select a repository"
			value={
				selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : undefined
			}
			onSelect={async (value, interaction) => {
				if (value === INSTALL_MORE_REPOS_VALUE) {
					await interaction.reply({
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
					});
					return;
				}
				const [owner, name] = value.split("/");
				if (owner && name) {
					setSelectedRepo({ owner, name });
				}
			}}
		>
			{repos.slice(0, 24).map((repo: GitHubRepo) => (
				<Option
					key={repo.fullName}
					value={repo.fullName}
					label={repo.fullName}
				/>
			))}
			{!hasAllReposAccess && (
				<Option
					value={INSTALL_MORE_REPOS_VALUE}
					label="+ Install on more repos..."
				/>
			)}
		</Select>
	);
}

type GitHubIssueCreatorProps = {
	initialTitle: string;
	initialBody: string;
	originalMessageId: string;
	originalChannelId: string;
	originalGuildId: string;
	originalThreadId?: string;
	discordUserId: string;
};

type CreateIssueInput = {
	repo: { owner: string; name: string };
	title: string;
	body: string;
	discordUserId: string;
	originalGuildId: string;
	originalChannelId: string;
	originalMessageId: string;
	originalThreadId?: string;
};

type CreateIssueResult =
	| { status: "success"; issueUrl: string; issueNumber: number }
	| { status: "error"; errorMessage: string };

const createIssueAtom = databaseRuntime.fn<CreateIssueInput>()(
	(input: CreateIssueInput) =>
		Effect.gen(function* () {
			const database = yield* Database;

			const result = yield* database.private.github
				.createGitHubIssueFromDiscord({
					discordId: BigInt(input.discordUserId),
					repoOwner: input.repo.owner,
					repoName: input.repo.name,
					title: input.title,
					body: input.body,
					discordServerId: BigInt(input.originalGuildId),
					discordChannelId: BigInt(input.originalChannelId),
					discordMessageId: BigInt(input.originalMessageId),
					discordThreadId: input.originalThreadId
						? BigInt(input.originalThreadId)
						: undefined,
				})
				.pipe(Effect.withSpan("create_github_issue_api_call"));

			if (!result.success) {
				if (
					result.code === "NOT_LINKED" ||
					result.code === "REFRESH_REQUIRED" ||
					result.code === "REFRESH_FAILED"
				) {
					return {
						status: "error" as const,
						errorMessage: `Your GitHub session has expired. Please re-link your account at ${makeMainSiteLink("/dashboard/settings")}`,
					};
				}
				return {
					status: "error" as const,
					errorMessage: result.error,
				};
			}

			return {
				status: "success" as const,
				issueUrl: result.issue.url,
				issueNumber: result.issue.number,
			};
		}),
);

function GitHubIssueCreator({
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
	} | null>(null);
	const [title, setTitle] = useState(initialTitle);
	const [body, setBody] = useState(initialBody);

	const createIssueResult = useAtomValue(createIssueAtom);
	const triggerCreateIssue = useAtomSet(createIssueAtom);

	const instance = useInstance();

	const handleCreateIssue = (repo: { owner: string; name: string }) => {
		triggerCreateIssue({
			repo,
			title,
			body,
			discordUserId,
			originalGuildId,
			originalChannelId,
			originalMessageId,
			originalThreadId,
		});
	};

	const isCreating =
		Result.isInitial(createIssueResult) && createIssueResult.waiting;
	const isSuccess =
		Result.isSuccess(createIssueResult) &&
		createIssueResult.value.status === "success";
	const isError =
		Result.isSuccess(createIssueResult) &&
		createIssueResult.value.status === "error";
	const successResult = isSuccess ? createIssueResult.value : null;
	const errorMessage = isError ? createIssueResult.value.errorMessage : null;

	if (
		isSuccess &&
		successResult &&
		successResult.status === "success" &&
		selectedRepo
	) {
		return (
			<Embed
				title="GitHub Issue Created"
				color={0x238636}
				url={successResult.issueUrl}
			>
				<EmbedField name="Repository">
					{selectedRepo.owner}/{selectedRepo.name}
				</EmbedField>
				<EmbedField name="Issue">#{successResult.issueNumber}</EmbedField>
				<EmbedField name="Title">{title}</EmbedField>
			</Embed>
		);
	}

	if (isError && errorMessage) {
		return (
			<>
				<Embed title="Failed to Create Issue" color={0xff0000}>
					{errorMessage}
				</Embed>
				<ActionRow>
					<Button
						label="Try Again"
						style="primary"
						onClick={() => {
							triggerCreateIssue(Atom.Reset);
						}}
					/>
					<Button
						label="Dismiss"
						style="danger"
						onClick={() => {
							instance.destroy();
						}}
					/>
				</ActionRow>
			</>
		);
	}

	return (
		<>
			<Embed title="New GitHub Issue" color={0x238636}>
				<EmbedField name="Title">{title || "_No title_"}</EmbedField>
				<EmbedField name="Description Preview">
					{body.length > 200 ? `${body.slice(0, 197)}...` : body}
				</EmbedField>
			</Embed>

			<RepoSelector
				discordUserId={discordUserId}
				selectedRepo={selectedRepo}
				setSelectedRepo={setSelectedRepo}
			/>

			<ActionRow>
				<ModalButton
					label="Edit"
					modalTitle="Edit GitHub Issue"
					fields={[
						{
							id: GITHUB_ISSUE_TITLE_INPUT,
							label: "Issue Title",
							style: "short",
							defaultValue: title,
							maxLength: 256,
							required: true,
						},
						{
							id: GITHUB_ISSUE_BODY_INPUT,
							label: "Issue Body",
							style: "paragraph",
							defaultValue: body,
							maxLength: 4000,
							required: true,
						},
					]}
					onSubmit={(fields) => {
						const newTitle = fields.get(GITHUB_ISSUE_TITLE_INPUT);
						const newBody = fields.get(GITHUB_ISSUE_BODY_INPUT);
						if (newTitle) setTitle(newTitle);
						if (newBody) setBody(newBody);
					}}
				/>
				<Button
					label={isCreating ? "Creating..." : "Create Issue"}
					style="success"
					disabled={!selectedRepo || isCreating}
					onClick={() => {
						if (selectedRepo) {
							handleCreateIssue(selectedRepo);
						}
					}}
				/>
				<Button
					label="Dismiss"
					style="danger"
					onClick={() => {
						instance.destroy();
					}}
				/>
			</ActionRow>
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
