import { Database } from "@packages/database/database";
import {
	ActionRow,
	Atom,
	Button,
	Container,
	Link,
	LoadingSelect,
	ModalButton,
	Option,
	Reacord,
	Result,
	Select,
	TextDisplay,
	useAtomSet,
	useAtomSuspense,
	useAtomValue,
	useInstance,
} from "@packages/reacord";
import type { ContextMenuCommandInteraction } from "discord.js";
import { ButtonStyle, ComponentType, MessageFlags } from "discord.js";
import { Cause, Data, Duration, Effect, Layer, Metric } from "effect";
import { Suspense, useState } from "react";
import { atomRuntime } from "../core/atom-runtime";
import { Discord } from "../core/discord-service";
import { commandExecuted } from "../metrics";
import {
	catchAllDefectWithReport,
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";
import {
	GITHUB_APP_INSTALL_URL,
	GitHubIssueTimeoutError,
	type GitHubRepo,
	generateIssueBody,
	generateIssueTitle,
	INSTALL_MORE_REPOS_VALUE,
	makeMainSiteLink,
} from "./github-issue-utils";

const COMMAND_NAME = "Create GitHub Issue";
const GITHUB_ISSUE_TITLE_INPUT = "github-issue-title";
const GITHUB_ISSUE_BODY_INPUT = "github-issue-body";

class GitHubNotLinkedError extends Data.TaggedError("GitHubNotLinkedError") {}
class GitHubTokenExpiredError extends Data.TaggedError(
	"GitHubTokenExpiredError",
) {}
class GitHubFetchError extends Data.TaggedError("GitHubFetchError")<{
	message: string;
}> {}
class GitHubSessionExpiredError extends Data.TaggedError(
	"GitHubSessionExpiredError",
)<{
	message: string;
}> {}
class GitHubCreateIssueError extends Data.TaggedError(
	"GitHubCreateIssueError",
)<{
	message: string;
}> {}

const reposAtomFamily = Atom.family((discordUserId: string) =>
	atomRuntime.atom(
		Effect.gen(function* () {
			const database = yield* Database;
			const reposResult = yield* database.private.github
				.getAccessibleReposByDiscordId({
					discordId: BigInt(discordUserId),
				})
				.pipe(Effect.withSpan("get_accessible_repos"));

			if (!reposResult.success) {
				if (reposResult.code === "NOT_LINKED") {
					return yield* new GitHubNotLinkedError();
				}
				if (
					reposResult.code === "REFRESH_REQUIRED" ||
					reposResult.code === "REFRESH_FAILED" ||
					reposResult.code === "NO_TOKEN"
				) {
					return yield* new GitHubTokenExpiredError();
				}
				return yield* new GitHubFetchError({ message: reposResult.error });
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
	const state = useAtomSuspense(reposAtomFamily(discordUserId), {
		includeFailure: true,
	});

	if (Result.isFailure(state)) {
		const failure = Cause.failureOption(state.cause);
		if (failure._tag === "Some") {
			const error = failure.value;
			if (error._tag === "GitHubNotLinkedError") {
				return (
					<Link
						url={GITHUB_APP_INSTALL_URL}
						label="Connect GitHub to continue"
					/>
				);
			}
			if (error._tag === "GitHubTokenExpiredError") {
				return (
					<Link
						url={GITHUB_APP_INSTALL_URL}
						label="Reconnect GitHub (session expired)"
					/>
				);
			}
		}
		return (
			<Link url={GITHUB_APP_INSTALL_URL} label="Failed to load repositories" />
		);
	}

	const { repos, hasAllReposAccess } = state.value;

	if (repos.length === 0) {
		return (
			<Link url={GITHUB_APP_INSTALL_URL} label="Install on a repository" />
		);
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
								type: ComponentType.ActionRow,
								components: [
									{
										type: ComponentType.Button,
										style: ButtonStyle.Link,
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
			{repos.slice(0, 23).map((repo: GitHubRepo) => (
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

const createIssueEffect = (input: CreateIssueInput) =>
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
				return yield* new GitHubSessionExpiredError({
					message: `Your GitHub session has expired. Please re-link your account at ${makeMainSiteLink("/dashboard/settings")}`,
				});
			}
			return yield* new GitHubCreateIssueError({
				message: result.error,
			});
		}

		return {
			status: "success" as const,
			issueUrl: result.issue.url,
			issueNumber: result.issue.number,
		};
	});

const createIssueAtom = atomRuntime.fn<CreateIssueInput>()(createIssueEffect);

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
	const isSuccess = Result.isSuccess(createIssueResult);
	const isError = Result.isFailure(createIssueResult);

	const successResult = isSuccess ? createIssueResult.value : null;

	let errorMessage: string | null = null;
	if (Result.isFailure(createIssueResult)) {
		const failure = Cause.failureOption(createIssueResult.cause);
		if (failure._tag === "Some") {
			const error = failure.value;
			if (
				error._tag === "GitHubSessionExpiredError" ||
				error._tag === "GitHubCreateIssueError"
			) {
				errorMessage = error.message;
			} else {
				errorMessage = "An unexpected error occurred";
			}
		}
	}

	if (isSuccess && successResult && selectedRepo) {
		return (
			<Container accentColor={0x238636}>
				<TextDisplay>
					## [GitHub Issue Created]({successResult.issueUrl})
				</TextDisplay>
				<TextDisplay>
					**Repository:** {selectedRepo.owner}/{selectedRepo.name}
				</TextDisplay>
				<TextDisplay>**Issue:** #{successResult.issueNumber}</TextDisplay>
				<TextDisplay>**Title:** {title}</TextDisplay>
			</Container>
		);
	}

	if (isError && errorMessage) {
		return (
			<>
				<Container accentColor={0xff0000}>
					<TextDisplay>## Failed to Create Issue</TextDisplay>
					<TextDisplay>{errorMessage}</TextDisplay>
				</Container>
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
			<Container accentColor={0x238636}>
				<TextDisplay>## New GitHub Issue</TextDisplay>
				<TextDisplay>**Title:** {title || "_No title_"}</TextDisplay>
				<TextDisplay>
					**Description Preview:**{" "}
					{body.length > 200 ? `${body.slice(0, 197)}...` : body}
				</TextDisplay>
			</Container>

			<Suspense
				fallback={<LoadingSelect placeholder="Loading repositories..." />}
			>
				<RepoSelector
					discordUserId={discordUserId}
					selectedRepo={selectedRepo}
					setSelectedRepo={setSelectedRepo}
				/>
			</Suspense>

			<ActionRow>
				<ModalButton
					label="Edit"
					modalTitle="Edit GitHub Issue"
					fields={[
						{
							type: "textInput",
							id: GITHUB_ISSUE_TITLE_INPUT,
							label: "Issue Title",
							style: "short",
							defaultValue: title,
							maxLength: 256,
							required: true,
						},
						{
							type: "textInput",
							id: GITHUB_ISSUE_BODY_INPUT,
							label: "Issue Body",
							style: "paragraph",
							defaultValue: body,
							maxLength: 4000,
							required: true,
						},
					]}
					onSubmit={(values) => {
						const newTitle = values.getTextInput(GITHUB_ISSUE_TITLE_INPUT);
						const newBody = values.getTextInput(GITHUB_ISSUE_BODY_INPUT);
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
	const hasPaidPlan = serverPreferences?.plan !== "FREE";

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

					const handleInteractionError = (message: string) =>
						Effect.gen(function* () {
							if (interaction.deferred || interaction.replied) {
								yield* catchAllSilentWithReport(
									discord.callClient(() =>
										interaction.editReply({ content: message }),
									),
								);
							} else {
								yield* catchAllSilentWithReport(
									discord.callClient(() =>
										interaction.reply({
											content: message,
											flags: MessageFlags.Ephemeral,
										}),
									),
								);
							}
						});

					yield* commandWithTimeout.pipe(
						catchAllWithReport((error) =>
							Effect.gen(function* () {
								console.error("Convert to GitHub issue command failed:", error);
								yield* handleInteractionError(
									"An error occurred while processing your request.",
								);
							}),
						),
						catchAllDefectWithReport((defect) =>
							Effect.gen(function* () {
								console.error(
									"Convert to GitHub issue command defect:",
									defect,
								);
								yield* handleInteractionError(
									"An unexpected error occurred. Please try again.",
								);
							}),
						),
					);
				}
			}),
		);
	}),
);
