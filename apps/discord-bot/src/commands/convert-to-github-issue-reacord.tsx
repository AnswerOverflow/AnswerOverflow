import { PostHogCaptureClientLayer } from "@packages/database/analytics/server/capture-client";
import { Database } from "@packages/database/database";
import { Storage } from "@packages/database/storage";
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
	Separator,
	TextDisplay,
	useAtomRefresh,
	useAtomSet,
	useAtomSuspense,
	useAtomValue,
	useInstance,
} from "@packages/reacord";
import type { ContextMenuCommandInteraction } from "discord.js";
import { ChannelType, MessageFlags } from "discord.js";
import { Cause, Data, Duration, Effect, Layer, Metric, Runtime } from "effect";
import type { ReactNode } from "react";
import { Suspense, useState } from "react";
import { atomRuntime } from "../core/atom-runtime";
import { Discord } from "../core/discord-service";
import {
	commandExecuted,
	githubIssueAIExtractionDuration,
	githubIssueAIExtractions,
	githubIssueAIFallbacks,
	githubIssueCommandDuration,
	githubIssueRateLimits,
	githubIssuesCreated,
	githubIssuesFailed,
} from "../metrics";
import {
	trackGitHubIssueAIExtraction,
	trackGitHubIssueCommandUsed,
	trackGitHubIssueCreated,
	trackGitHubIssueCreationFailed,
	trackGitHubIssueRateLimited,
} from "../utils/analytics";
import {
	catchAllDefectWithReport,
	catchAllSilentWithReport,
	catchAllWithReport,
} from "../utils/error-reporting";
import {
	type ExtractedIssue,
	extractIssuesFromMessage,
} from "./extract-github-issues";
import {
	buildAttachmentsSection,
	buildIssueBody,
	buildIssueFooter,
	GITHUB_APP_INSTALL_URL,
	GitHubIssueTimeoutError,
	type GitHubRepo,
	generateFallbackBody,
	generateFallbackTitle,
	INSTALL_MORE_REPOS_VALUE,
	makeMainSiteLink,
	type UploadedAttachment,
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
			const reposResult = yield* database.authenticated.github
				.getAccessibleRepos({}, { discordAccountId: BigInt(discordUserId) })
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

const SEARCH_REPOS_INPUT = "repo-search-query";

type InstallFlowProps = {
	message: string;
	linkLabel: string;
	onRefresh: () => void;
	onBack?: () => void;
};

function InstallFlow({
	message,
	linkLabel,
	onRefresh,
	onBack,
}: InstallFlowProps) {
	const [refreshing, setRefreshing] = useState(false);

	if (refreshing) {
		return <LoadingSelect placeholder="Refreshing repositories..." />;
	}

	return (
		<>
			<Container>
				<TextDisplay>{message}</TextDisplay>
			</Container>
			<ActionRow>
				<Link url={GITHUB_APP_INSTALL_URL} label={linkLabel} />
				<Button
					label="I've installed it"
					style="success"
					onClick={() => {
						setRefreshing(true);
						onRefresh();
					}}
				/>
				{onBack && (
					<Button label="Back" style="secondary" onClick={() => onBack()} />
				)}
			</ActionRow>
		</>
	);
}

type RepoSelectorProps = {
	discordUserId: string;
	selectedRepo: { owner: string; name: string } | null;
	setSelectedRepo: (repo: { owner: string; name: string } | null) => void;
	searchFilter: string;
	setSearchFilter: (filter: string) => void;
};

function RepoSelector({
	discordUserId,
	selectedRepo,
	setSelectedRepo,
	searchFilter,
	setSearchFilter,
}: RepoSelectorProps) {
	const [searching, setSearching] = useState(false);
	const [installingMore, setInstallingMore] = useState(false);
	const refreshRepos = useAtomRefresh(reposAtomFamily(discordUserId));
	const state = useAtomSuspense(reposAtomFamily(discordUserId), {
		includeFailure: true,
	});

	if (Result.isFailure(state)) {
		const failure = Cause.failureOption(state.cause);
		if (failure._tag === "Some") {
			const error = failure.value;
			if (error._tag === "GitHubNotLinkedError") {
				return (
					<InstallFlow
						message="Connect your GitHub account to create issues."
						linkLabel="Connect GitHub"
						onRefresh={refreshRepos}
					/>
				);
			}
			if (error._tag === "GitHubTokenExpiredError") {
				return (
					<InstallFlow
						message="Your GitHub session has expired. Please reconnect."
						linkLabel="Reconnect GitHub"
						onRefresh={refreshRepos}
					/>
				);
			}
		}
		return (
			<InstallFlow
				message="Failed to load repositories. Try installing the GitHub app again."
				linkLabel="Install GitHub App"
				onRefresh={refreshRepos}
			/>
		);
	}

	const { repos } = state.value;

	if (repos.length === 0) {
		return (
			<InstallFlow
				message="No repositories found. Install the Answer Overflow GitHub app on a repository to get started."
				linkLabel="Install on a repository"
				onRefresh={refreshRepos}
			/>
		);
	}

	if (installingMore) {
		return (
			<InstallFlow
				message="Install the Answer Overflow GitHub app on more repositories, then come back and click &quot;I've installed it&quot; to refresh."
				linkLabel="Install Answer Overflow"
				onRefresh={() => {
					setInstallingMore(false);
					refreshRepos();
				}}
				onBack={() => setInstallingMore(false)}
			/>
		);
	}

	if (searching) {
		return (
			<ActionRow>
				<ModalButton
					label="🔍 Type repo name..."
					style="primary"
					modalTitle="Search Repositories"
					fields={[
						{
							type: "textInput",
							id: SEARCH_REPOS_INPUT,
							label: "Repository name",
							style: "short",
							placeholder: "e.g. my-repo or org/repo",
							defaultValue: searchFilter,
							required: false,
							maxLength: 100,
						},
					]}
					onSubmit={(values) => {
						const query = values.getTextInput(SEARCH_REPOS_INPUT) ?? "";
						setSearchFilter(query.trim());
						setSearching(false);
					}}
				/>
				<Button
					label="Cancel"
					style="secondary"
					onClick={() => setSearching(false)}
				/>
			</ActionRow>
		);
	}

	const lowerFilter = searchFilter.toLowerCase();
	const sortedRepos = [...repos].sort((a: GitHubRepo, b: GitHubRepo) =>
		a.fullName.localeCompare(b.fullName),
	);
	const filteredRepos = searchFilter
		? sortedRepos.filter((r: GitHubRepo) =>
				r.fullName.toLowerCase().includes(lowerFilter),
			)
		: sortedRepos;

	const maxRepoOptions = 22;
	const displayRepos = filteredRepos.slice(0, maxRepoOptions);
	const placeholder = searchFilter
		? `Filtered: "${searchFilter}" (${filteredRepos.length} results)`
		: "Select a repository";

	return (
		<Select
			placeholder={placeholder}
			value={
				selectedRepo ? `${selectedRepo.owner}/${selectedRepo.name}` : undefined
			}
			onSelect={(value) => {
				if (value === INSTALL_MORE_REPOS_VALUE) {
					setInstallingMore(true);
					return;
				}
				if (value === "__search__") {
					setSearching(true);
					return;
				}
				const [owner, name] = value.split("/");
				if (owner && name) {
					setSelectedRepo({ owner, name });
				}
			}}
		>
			<Option
				value="__search__"
				label={
					searchFilter
						? `🔍 "${searchFilter}" — search again`
						: "🔍 Search repositories..."
				}
			/>
			{displayRepos.map((repo: GitHubRepo) => (
				<Option
					key={repo.fullName}
					value={repo.fullName}
					label={repo.fullName}
				/>
			))}
			<Option
				value={INSTALL_MORE_REPOS_VALUE}
				label="+ Install on more repos..."
			/>
		</Select>
	);
}

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

		yield* Effect.annotateCurrentSpan({
			"github.repo_owner": input.repo.owner,
			"github.repo_name": input.repo.name,
			"github.issue_title": input.title,
			"discord.guild_id": input.originalGuildId,
			"discord.channel_id": input.originalChannelId,
			"discord.message_id": input.originalMessageId,
			"discord.user_id": input.discordUserId,
		});

		const result = yield* database.authenticated.github
			.createIssue(
				{
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
				},
				{ discordAccountId: BigInt(input.discordUserId) },
			)
			.pipe(Effect.withSpan("create_github_issue_api_call"));

		if (!result.success) {
			yield* Metric.increment(githubIssuesFailed);
			yield* Effect.annotateCurrentSpan({
				"github.error_code": result.code,
				"github.error_message": result.error,
			});
			yield* trackGitHubIssueCreationFailed({
				userId: input.discordUserId,
				guildId: input.originalGuildId,
				channelId: input.originalChannelId,
				messageId: input.originalMessageId,
				errorType: result.code,
				errorMessage: result.error,
				repoOwner: input.repo.owner,
				repoName: input.repo.name,
			}).pipe(
				Effect.provide(PostHogCaptureClientLayer),
				Effect.catchAll(() => Effect.void),
			);

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

		yield* Metric.increment(githubIssuesCreated);
		yield* Effect.annotateCurrentSpan({
			"github.issue_number": result.issue.number,
			"github.issue_url": result.issue.url,
		});
		yield* trackGitHubIssueCreated({
			userId: input.discordUserId,
			guildId: input.originalGuildId,
			channelId: input.originalChannelId,
			messageId: input.originalMessageId,
			threadId: input.originalThreadId,
			repoOwner: input.repo.owner,
			repoName: input.repo.name,
			issueNumber: result.issue.number,
			issueUrl: result.issue.url,
			issuesInBatch: 1,
		}).pipe(
			Effect.provide(PostHogCaptureClientLayer),
			Effect.catchAll(() => Effect.void),
		);

		return {
			issueUrl: result.issue.url,
			issueNumber: result.issue.number,
		};
	}).pipe(Effect.withSpan("create_github_issue"));

const createIssueAtom = atomRuntime.fn<CreateIssueInput>()(createIssueEffect);

type IssueState = {
	title: string;
	body: string;
	created: { issueUrl: string; issueNumber: number } | null;
};

type ChannelContext = {
	isThread: boolean;
	isForum: boolean;
	parentChannelName: string | null;
	threadId: string | null;
	channelId: string;
	messageId: string;
};

type SendRecapFn = (
	target: "channel" | "thread",
	content: ReactNode,
) => Promise<void>;

type RecapContentProps = {
	issues: Array<IssueState>;
	selectedRepo: { owner: string; name: string } | null;
};

function RecapContent({ issues, selectedRepo }: RecapContentProps) {
	const totalIssues = issues.length;
	const lines = issues.map((issue) =>
		issue.created
			? `[#${issue.created.issueNumber}](${issue.created.issueUrl}) ${issue.title}`
			: issue.title,
	);

	return (
		<Container accentColor={0x238636}>
			<TextDisplay>
				##
				{totalIssues === 1
					? " GitHub Issue Created"
					: ` ${totalIssues} GitHub Issues Created`}
			</TextDisplay>
			{selectedRepo && (
				<TextDisplay>
					**Repository:** {selectedRepo.owner}/{selectedRepo.name}
				</TextDisplay>
			)}
			{lines.map((line, i) => (
				<TextDisplay key={i}>{line}</TextDisplay>
			))}
		</Container>
	);
}

type MultiIssueCreatorProps = {
	extractedIssues: Array<ExtractedIssue>;
	footer: string;
	attachmentsSection: string;
	originalMessageId: string;
	originalChannelId: string;
	originalGuildId: string;
	originalThreadId?: string;
	discordUserId: string;
	channelContext: ChannelContext;
	sendRecap: SendRecapFn;
};

function MultiIssueCreator({
	extractedIssues,
	footer,
	attachmentsSection,
	originalMessageId,
	originalChannelId,
	originalGuildId,
	originalThreadId,
	discordUserId,
	channelContext,
	sendRecap,
}: MultiIssueCreatorProps) {
	const [selectedRepo, setSelectedRepo] = useState<{
		owner: string;
		name: string;
	} | null>(null);
	const [searchFilter, setSearchFilter] = useState("");
	const [currentIndex, setCurrentIndex] = useState(0);
	const [issues, setIssues] = useState<Array<IssueState>>(() =>
		extractedIssues.map((issue) => ({
			title: issue.title,
			body: buildIssueBody(issue.body, attachmentsSection, footer),
			created: null,
		})),
	);

	const createIssueResult = useAtomValue(createIssueAtom);
	const triggerCreateIssue = useAtomSet(createIssueAtom);
	const instance = useInstance();

	const totalIssues = issues.length;
	const currentIssue = issues[currentIndex];
	const allCreated = issues.every((i) => i.created !== null);
	const createdCount = issues.filter((i) => i.created !== null).length;
	const isCreating =
		Result.isInitial(createIssueResult) && createIssueResult.waiting;

	if (
		Result.isSuccess(createIssueResult) &&
		currentIssue &&
		!currentIssue.created
	) {
		const result = createIssueResult.value;
		setIssues((prev) =>
			prev.map((issue, i) =>
				i === currentIndex
					? {
							...issue,
							created: {
								issueUrl: result.issueUrl,
								issueNumber: result.issueNumber,
							},
						}
					: issue,
			),
		);
		triggerCreateIssue(Atom.Reset);

		const nextUncreated = issues.findIndex(
			(issue, i) => i > currentIndex && !issue.created,
		);
		if (nextUncreated !== -1) {
			setCurrentIndex(nextUncreated);
		}
	}

	if (Result.isFailure(createIssueResult)) {
		const failure = Cause.failureOption(createIssueResult.cause);
		let errorMessage = "An unexpected error occurred";
		if (failure._tag === "Some") {
			const error = failure.value;
			if (
				error._tag === "GitHubSessionExpiredError" ||
				error._tag === "GitHubCreateIssueError"
			) {
				errorMessage = error.message;
			}
		}

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
						onClick={() => triggerCreateIssue(Atom.Reset)}
					/>
					<Button
						label="Dismiss"
						style="danger"
						onClick={() => instance.destroy()}
					/>
				</ActionRow>
			</>
		);
	}

	if (allCreated) {
		const recapNode = (
			<RecapContent issues={issues} selectedRepo={selectedRepo} />
		);

		const showSendToParent =
			channelContext.isThread &&
			!channelContext.isForum &&
			channelContext.parentChannelName;

		const showReplyInChannel = !channelContext.isThread;

		return (
			<>
				{recapNode}
				<ActionRow>
					{showSendToParent && (
						<Button
							label={`Send to #${channelContext.parentChannelName}`}
							style="primary"
							onClick={() => sendRecap("channel", recapNode)}
						/>
					)}
					{showReplyInChannel && (
						<Button
							label="Reply in channel"
							style="primary"
							onClick={() => sendRecap("channel", recapNode)}
						/>
					)}
					<Button
						label="Send in thread"
						style="secondary"
						onClick={() => sendRecap("thread", recapNode)}
					/>
				</ActionRow>
			</>
		);
	}

	if (!currentIssue) return null;

	const bodyPreview =
		currentIssue.body.length > 4000
			? `${currentIssue.body.slice(0, 3997)}...`
			: currentIssue.body;

	const paginationFooter =
		totalIssues > 1
			? `-# ${currentIndex + 1}/${totalIssues} ${createdCount > 0 ? `· ${createdCount} created` : ""}`
			: null;

	return (
		<>
			<Container accentColor={currentIssue.created ? 0x238636 : 0x5865f2}>
				<TextDisplay>
					**{currentIssue.title}**
					{currentIssue.created ? " ✓" : ""}
				</TextDisplay>
				<Separator spacing="small" />
				<TextDisplay>{bodyPreview}</TextDisplay>
				{paginationFooter && (
					<>
						<Separator spacing="small" />
						<TextDisplay>{paginationFooter}</TextDisplay>
					</>
				)}
			</Container>

			<Suspense
				fallback={<LoadingSelect placeholder="Loading repositories..." />}
			>
				<RepoSelector
					discordUserId={discordUserId}
					selectedRepo={selectedRepo}
					setSelectedRepo={setSelectedRepo}
					searchFilter={searchFilter}
					setSearchFilter={setSearchFilter}
				/>
			</Suspense>

			<ActionRow>
				{totalIssues > 1 && (
					<Button
						label="◀ Prev"
						style="secondary"
						disabled={currentIndex === 0}
						onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
					/>
				)}
				{totalIssues > 1 && (
					<Button
						label="Next ▶"
						style="secondary"
						disabled={currentIndex === totalIssues - 1}
						onClick={() =>
							setCurrentIndex((i) => Math.min(totalIssues - 1, i + 1))
						}
					/>
				)}
				<ModalButton
					label="Edit"
					modalTitle="Edit GitHub Issue"
					fields={[
						{
							type: "textInput",
							id: GITHUB_ISSUE_TITLE_INPUT,
							label: "Issue Title",
							style: "short",
							defaultValue: currentIssue.title,
							maxLength: 256,
							required: true,
						},
						{
							type: "textInput",
							id: GITHUB_ISSUE_BODY_INPUT,
							label: "Issue Body",
							style: "paragraph",
							defaultValue: currentIssue.body,
							maxLength: 4000,
							required: true,
						},
					]}
					onSubmit={(values) => {
						const newTitle = values.getTextInput(GITHUB_ISSUE_TITLE_INPUT);
						const newBody = values.getTextInput(GITHUB_ISSUE_BODY_INPUT);
						if (newTitle || newBody) {
							setIssues((prev) =>
								prev.map((issue, i) =>
									i === currentIndex
										? {
												...issue,
												...(newTitle ? { title: newTitle } : {}),
												...(newBody ? { body: newBody } : {}),
											}
										: issue,
								),
							);
						}
					}}
				/>
			</ActionRow>

			<ActionRow>
				<Button
					label={
						isCreating
							? "Creating..."
							: currentIssue.created
								? "Created ✓"
								: "Create Issue"
					}
					style="success"
					disabled={!selectedRepo || isCreating || !!currentIssue.created}
					onClick={() => {
						if (selectedRepo) {
							triggerCreateIssue({
								repo: selectedRepo,
								title: currentIssue.title,
								body: currentIssue.body,
								discordUserId,
								originalGuildId,
								originalChannelId,
								originalMessageId,
								originalThreadId,
							});
						}
					}}
				/>
				<Button
					label="Dismiss"
					style="danger"
					onClick={() => instance.destroy()}
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
	const commandStartTime = Date.now();
	yield* Metric.increment(commandExecuted("convert_to_github_issue"));

	const discord = yield* Discord;
	yield* discord.callClient(() =>
		interaction.deferReply({ flags: MessageFlags.Ephemeral }),
	);

	const database = yield* Database;
	const reacord = yield* Reacord;

	yield* trackGitHubIssueCommandUsed({
		userId: interaction.user.id,
		guildId: interaction.guildId ?? "unknown",
		channelId: interaction.channelId ?? "unknown",
		messageId: interaction.targetId,
	}).pipe(Effect.catchAll(() => Effect.void));

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

	yield* Effect.annotateCurrentSpan({
		"discord.target_message_author": targetMessage.author.id,
		"discord.target_message_length": targetMessage.content.length,
		"discord.target_channel_type": targetMessage.channel.type,
	});

	const channel = targetMessage.channel;
	const isThread = channel.isThread();
	const threadId = isThread ? channel.id : undefined;
	const parentChannelId = isThread ? channel.parentId : targetMessage.channelId;

	const isForum = isThread && channel.parent?.type === ChannelType.GuildForum;

	const parentChannelName =
		isThread && channel.parent && !isForum ? channel.parent.name : null;

	yield* Effect.annotateCurrentSpan({
		"discord.is_thread": isThread,
		"discord.is_forum": isForum,
		"discord.thread_id": threadId ?? "none",
	});

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

	yield* Effect.annotateCurrentSpan({
		"server.indexing_enabled": indexingEnabled,
		"server.has_paid_plan": hasPaidPlan,
	});

	const footer = buildIssueFooter({
		message: targetMessage,
		indexingEnabled,
		hasPaidPlan,
	});

	const rateLimitResult = yield* database.private.github
		.checkAiIssueExtractionRateLimit({
			discordId: BigInt(interaction.user.id),
		})
		.pipe(Effect.withSpan("check_ai_extraction_rate_limit"));

	if (!rateLimitResult.ok) {
		const retrySeconds = Math.ceil((rateLimitResult.retryAfter ?? 0) / 1000);
		yield* Metric.increment(githubIssueRateLimits);
		yield* Effect.annotateCurrentSpan({
			"rate_limit.hit": true,
			"rate_limit.retry_after_seconds": retrySeconds,
		});
		yield* trackGitHubIssueRateLimited({
			userId: interaction.user.id,
			guildId: interaction.guildId ?? "unknown",
			rateLimitType: "ai_extraction",
			retryAfterSeconds: retrySeconds,
		}).pipe(Effect.catchAll(() => Effect.void));
		yield* discord.callClient(() =>
			interaction.editReply({
				content: `You're using this too quickly. Please try again in ${retrySeconds} seconds.`,
			}),
		);
		return;
	}

	const aiExtractionStartTime = Date.now();
	yield* Metric.increment(githubIssueAIExtractions);
	let usedFallback = false;

	const extractedIssues = yield* extractIssuesFromMessage(targetMessage).pipe(
		Effect.catchAll(() => {
			usedFallback = true;
			return Effect.succeed([
				{
					title: generateFallbackTitle(targetMessage),
					body: generateFallbackBody(targetMessage),
				},
			]);
		}),
		Effect.withSpan("extract_issues_ai"),
	);

	const aiExtractionDuration = Date.now() - aiExtractionStartTime;
	yield* Metric.update(githubIssueAIExtractionDuration, aiExtractionDuration);

	if (usedFallback) {
		yield* Metric.increment(githubIssueAIFallbacks);
	}

	yield* Effect.annotateCurrentSpan({
		"ai.issues_extracted": extractedIssues.length,
		"ai.used_fallback": usedFallback,
		"ai.extraction_duration_ms": aiExtractionDuration,
	});

	yield* trackGitHubIssueAIExtraction({
		userId: interaction.user.id,
		guildId: interaction.guildId ?? "unknown",
		channelId: interaction.channelId ?? "unknown",
		messageId: interaction.targetId,
		issuesExtracted: extractedIssues.length,
		usedFallback,
		messageLength: targetMessage.content.length,
	}).pipe(Effect.catchAll(() => Effect.void));

	const commandDuration = Date.now() - commandStartTime;
	yield* Metric.update(githubIssueCommandDuration, commandDuration);

	const channelContext: ChannelContext = {
		isThread,
		isForum,
		parentChannelName,
		threadId: threadId ?? null,
		channelId: targetMessage.channelId,
		messageId: targetMessage.id,
	};

	const sendRecap: SendRecapFn = async (target, content) => {
		const sendToChannel = (
			ch: Parameters<typeof reacord.send>[0],
			options?: Parameters<typeof reacord.send>[2],
		) =>
			Runtime.runPromise(Runtime.defaultRuntime)(
				reacord.send(ch, content, options),
			);

		if (target === "channel") {
			if (isThread && channel.parent && channel.parent.isSendable()) {
				await sendToChannel(channel.parent);
			} else if (!isThread && channel.isSendable()) {
				await sendToChannel(channel, {
					reply: { messageReference: targetMessage.id },
				});
			}
		} else if (target === "thread") {
			if (isThread) {
				await sendToChannel(channel);
			} else if ("threads" in channel) {
				const existingThread = targetMessage.thread;
				if (existingThread) {
					await sendToChannel(existingThread);
				} else {
					const thread = await channel.threads.create({
						name: `GitHub Issues — ${extractedIssues[0]?.title ?? "Issues"}`.slice(
							0,
							100,
						),
						startMessage: targetMessage,
					});
					await sendToChannel(thread);
				}
			}
		}
	};

	const discordAttachments = [...targetMessage.attachments.values()];
	let uploadedAttachments: Array<UploadedAttachment> = [];

	if (discordAttachments.length > 0) {
		const storage = yield* Storage;
		const cdnDomain = process.env.CDN_DOMAIN ?? "cdn.answeroverflow.com";

		yield* Effect.forEach(
			discordAttachments,
			(a) =>
				storage
					.uploadFileFromUrl({
						id: a.id,
						filename: a.name ?? "attachment",
						contentType: a.contentType ?? undefined,
						url: a.url,
					})
					.pipe(Effect.catchAll(() => Effect.void)),
			{ concurrency: 5 },
		).pipe(Effect.withSpan("upload_github_issue_attachments"));

		uploadedAttachments = discordAttachments.map((a) => ({
			filename: a.name ?? "attachment",
			contentType: a.contentType ?? undefined,
			url: `https://${cdnDomain}/${a.id}/${a.name ?? "attachment"}`,
		}));
	}

	const attachmentsSection = buildAttachmentsSection(uploadedAttachments);

	yield* reacord.reply(
		interaction,
		<MultiIssueCreator
			extractedIssues={extractedIssues}
			footer={footer}
			attachmentsSection={attachmentsSection}
			originalMessageId={targetMessage.id}
			originalChannelId={targetMessage.channelId}
			originalGuildId={targetMessage.guildId ?? ""}
			originalThreadId={threadId}
			discordUserId={interaction.user.id}
			channelContext={channelContext}
			sendRecap={sendRecap}
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
