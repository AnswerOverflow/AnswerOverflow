import { v } from "convex/values";
import { Effect, Option, Stream } from "effect";
import { internal } from "../_generated/api";
import { internalAction, internalMutation } from "../client";
import {
	privateAction,
	privateMutation,
	privateQuery,
} from "../client/private";
import { githubIssueStatusValidator } from "../schema";
import {
	createGitHubIssue,
	createOctokitClient,
	fetchGitHubInstallationRepos,
	type GitHubErrorCode,
	GitHubErrorCodes,
	type GitHubRepo,
	getBetterAuthUserIdByDiscordId,
	getGitHubAccountByDiscordId,
	validateIssueTitleAndBody,
	validateRepoOwnerAndName,
} from "../shared/github";

const _repoValidator = v.object({
	id: v.number(),
	name: v.string(),
	fullName: v.string(),
	owner: v.string(),
	private: v.boolean(),
	installationId: v.number(),
});

const _errorCodeValidator = v.union(
	v.literal("NOT_LINKED"),
	v.literal("NO_TOKEN"),
	v.literal("REFRESH_REQUIRED"),
	v.literal("REFRESH_FAILED"),
	v.literal("FETCH_FAILED"),
	v.literal("CREATE_FAILED"),
	v.literal("USER_NOT_FOUND"),
	v.literal("INVALID_REPO"),
	v.literal("INVALID_INPUT"),
	v.literal("RATE_LIMITED"),
);

export const getAccessibleReposByDiscordId = privateAction({
	args: {
		discordId: v.int64(),
	},
	handler: async (
		ctx,
		args,
	): Promise<
		| { success: false; error: string; code: GitHubErrorCode }
		| { success: true; repos: Array<GitHubRepo>; hasAllReposAccess: boolean }
	> => {
		const userId = await getBetterAuthUserIdByDiscordId(ctx, args.discordId);
		if (!userId) {
			return {
				success: false as const,
				error: "User not found",
				code: GitHubErrorCodes.USER_NOT_FOUND,
			};
		}

		const rateLimitResult = await ctx.runMutation(
			internal.internal.rateLimiter.checkGitHubFetchRepos,
			{ userId },
		);
		if (!rateLimitResult.ok) {
			return {
				success: false as const,
				error: `Rate limited. Try again in ${Math.ceil((rateLimitResult.retryAfter ?? 0) / 1000)} seconds.`,
				code: GitHubErrorCodes.RATE_LIMITED,
			};
		}

		const account = await getGitHubAccountByDiscordId(ctx, args.discordId);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: GitHubErrorCodes.NOT_LINKED,
			};
		}

		const octokitResult = await createOctokitClient(ctx, account);
		if (!octokitResult.success) {
			return {
				success: false as const,
				error: octokitResult.error,
				code: octokitResult.code,
			};
		}

		try {
			const { repos, hasAllReposAccess } = await fetchGitHubInstallationRepos(
				octokitResult.octokit,
			);

			return {
				success: true as const,
				repos,
				hasAllReposAccess,
			};
		} catch (error) {
			return {
				success: false as const,
				error: error instanceof Error ? error.message : "Failed to fetch repos",
				code: GitHubErrorCodes.FETCH_FAILED,
			};
		}
	},
});

type CreateIssueSuccess = {
	success: true;
	issue: {
		id: number;
		number: number;
		url: string;
		title: string;
	};
};

type CreateIssueError = {
	success: false;
	error: string;
	code: GitHubErrorCode;
};

export const createGitHubIssueFromDiscord = privateAction({
	args: {
		discordId: v.int64(),
		repoOwner: v.string(),
		repoName: v.string(),
		title: v.string(),
		body: v.string(),
		discordServerId: v.int64(),
		discordChannelId: v.int64(),
		discordMessageId: v.int64(),
		discordThreadId: v.optional(v.int64()),
	},
	handler: async (
		ctx,
		args,
	): Promise<CreateIssueSuccess | CreateIssueError> => {
		const repoValidation = validateRepoOwnerAndName(
			args.repoOwner,
			args.repoName,
		);
		if (!repoValidation.valid) {
			return {
				success: false as const,
				error: repoValidation.error,
				code: GitHubErrorCodes.INVALID_REPO,
			};
		}

		const inputValidation = validateIssueTitleAndBody(args.title, args.body);
		if (!inputValidation.valid) {
			return {
				success: false as const,
				error: inputValidation.error,
				code: GitHubErrorCodes.INVALID_INPUT,
			};
		}

		const userId = await getBetterAuthUserIdByDiscordId(ctx, args.discordId);
		if (!userId) {
			return {
				success: false as const,
				error: "User not found",
				code: GitHubErrorCodes.USER_NOT_FOUND,
			};
		}

		const rateLimitResult = await ctx.runMutation(
			internal.internal.rateLimiter.checkGitHubCreateIssue,
			{ userId },
		);
		if (!rateLimitResult.ok) {
			return {
				success: false as const,
				error: `Rate limited. Try again in ${Math.ceil((rateLimitResult.retryAfter ?? 0) / 1000)} seconds.`,
				code: GitHubErrorCodes.RATE_LIMITED,
			};
		}

		const account = await getGitHubAccountByDiscordId(ctx, args.discordId);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: GitHubErrorCodes.NOT_LINKED,
			};
		}

		const octokitResult = await createOctokitClient(ctx, account);
		if (!octokitResult.success) {
			return {
				success: false as const,
				error: octokitResult.error,
				code: octokitResult.code,
			};
		}

		try {
			const issue = await createGitHubIssue(
				octokitResult.octokit,
				args.repoOwner,
				args.repoName,
				args.title,
				args.body,
			);

			await ctx.runMutation(
				internal.private.github.createGitHubIssueRecordInternal,
				{
					issueId: issue.id,
					issueNumber: issue.number,
					repoOwner: args.repoOwner,
					repoName: args.repoName,
					issueUrl: issue.htmlUrl,
					issueTitle: issue.title,
					discordServerId: args.discordServerId,
					discordChannelId: args.discordChannelId,
					discordMessageId: args.discordMessageId,
					discordThreadId: args.discordThreadId,
					createdByUserId: userId,
				},
			);

			return {
				success: true as const,
				issue: {
					id: issue.id,
					number: issue.number,
					url: issue.htmlUrl,
					title: issue.title,
				},
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error ? error.message : "Failed to create issue",
				code: GitHubErrorCodes.CREATE_FAILED,
			};
		}
	},
});

export const createGitHubIssueRecordInternal = internalMutation({
	args: {
		issueId: v.number(),
		issueNumber: v.number(),
		repoOwner: v.string(),
		repoName: v.string(),
		issueUrl: v.string(),
		issueTitle: v.string(),
		discordServerId: v.int64(),
		discordChannelId: v.int64(),
		discordMessageId: v.int64(),
		discordThreadId: v.optional(v.int64()),
		createdByUserId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("githubIssues", {
			issueId: args.issueId,
			issueNumber: args.issueNumber,
			repoOwner: args.repoOwner,
			repoName: args.repoName,
			issueUrl: args.issueUrl,
			issueTitle: args.issueTitle,
			discordServerId: args.discordServerId,
			discordChannelId: args.discordChannelId,
			discordMessageId: args.discordMessageId,
			discordThreadId: args.discordThreadId,
			createdByUserId: args.createdByUserId,
			status: "open",
		});
	},
});

export const getGitHubIssueByRepoAndNumber = privateQuery({
	args: {
		repoOwner: v.string(),
		repoName: v.string(),
		issueNumber: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("githubIssues")
			.withIndex("by_repoOwner_and_repoName_and_issueNumber", (q) =>
				q
					.eq("repoOwner", args.repoOwner)
					.eq("repoName", args.repoName)
					.eq("issueNumber", args.issueNumber),
			)
			.first();
	},
});

export const updateGitHubIssueStatus = privateMutation({
	args: {
		repoOwner: v.string(),
		repoName: v.string(),
		issueNumber: v.number(),
		status: githubIssueStatusValidator,
	},
	handler: async (ctx, args) => {
		const issue = await ctx.db
			.query("githubIssues")
			.withIndex("by_repoOwner_and_repoName_and_issueNumber", (q) =>
				q
					.eq("repoOwner", args.repoOwner)
					.eq("repoName", args.repoName)
					.eq("issueNumber", args.issueNumber),
			)
			.first();

		if (!issue) {
			return null;
		}

		await ctx.db.patch(issue._id, { status: args.status });
		return issue;
	},
});

const DISCORD_INVITE_REGEX =
	/(?:discord\.gg|discord(?:app)?\.com\/invite)\/([a-zA-Z0-9-]+)/i;

const URL_REGEX = /https?:\/\/[^\s"'<>\]()]+/gi;

type DiscordInviteApiResponse = {
	guild?: {
		id: string;
		name: string;
	};
};

type ValidatedInvite = {
	code: string;
	guildId: string;
	guildName: string;
};

const validateInviteWithDiscordApi = (
	inviteCode: string,
): Effect.Effect<ValidatedInvite, Error> =>
	Effect.tryPromise({
		try: async () => {
			const response = await fetch(
				`https://discord.com/api/v10/invites/${inviteCode}`,
			);
			if (!response.ok) {
				throw new Error(`Invalid invite: ${inviteCode}`);
			}
			const data = (await response.json()) as DiscordInviteApiResponse;
			if (!data.guild?.id) {
				throw new Error(`No guild for invite: ${inviteCode}`);
			}
			return {
				code: inviteCode,
				guildId: data.guild.id,
				guildName: data.guild.name,
			};
		},
		catch: (error) =>
			error instanceof Error ? error : new Error(String(error)),
	});

const resolveUrlToDiscordInvite = (
	url: string,
): Effect.Effect<Option.Option<string>, never> =>
	Effect.gen(function* () {
		const directMatch = url.match(DISCORD_INVITE_REGEX);
		if (directMatch?.[1]) {
			return Option.some(directMatch[1]);
		}

		let currentUrl = url;
		const maxRedirects = 5;

		for (let i = 0; i < maxRedirects; i++) {
			const result = yield* Effect.tryPromise({
				try: () => fetch(currentUrl, { method: "HEAD", redirect: "manual" }),
				catch: () => new Error("Fetch failed"),
			}).pipe(Effect.option);

			if (Option.isNone(result)) {
				return Option.none();
			}

			const location = result.value.headers.get("location");
			if (!location) {
				return Option.none();
			}

			const absoluteLocation = location.startsWith("http")
				? location
				: new URL(location, currentUrl).toString();

			const discordMatch = absoluteLocation.match(DISCORD_INVITE_REGEX);
			if (discordMatch?.[1]) {
				return Option.some(discordMatch[1]);
			}

			currentUrl = absoluteLocation;
		}

		return Option.none();
	}).pipe(Effect.catchAll(() => Effect.succeed(Option.none())));

const processUrlForValidInvite = (
	url: string,
): Effect.Effect<Option.Option<ValidatedInvite>, never> =>
	Effect.gen(function* () {
		const inviteCodeOption = yield* resolveUrlToDiscordInvite(url);

		if (Option.isNone(inviteCodeOption)) {
			return Option.none();
		}

		const validated = yield* validateInviteWithDiscordApi(
			inviteCodeOption.value,
		).pipe(Effect.option);

		return validated;
	});

const findFirstValidDiscordInvite = (
	urls: Array<string>,
): Effect.Effect<Option.Option<ValidatedInvite>, never> =>
	Stream.fromIterable(urls).pipe(
		Stream.mapEffect(processUrlForValidInvite, { concurrency: 5 }),
		Stream.filterMap((opt) => opt),
		Stream.runHead,
	);

async function fetchRepoReadme(
	owner: string,
	repo: string,
): Promise<string | null> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/readme`,
		{
			headers: {
				Accept: "application/vnd.github.raw+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		return null;
	}

	return response.text();
}

export type DiscordInviteInfo = {
	hasDiscordInvite: boolean;
	inviteCodes: Array<string>;
	isOnAnswerOverflow: boolean;
	serverName?: string;
};

export const fetchDiscordInviteInfoInternal = internalAction({
	args: {
		owner: v.string(),
		repo: v.string(),
	},
	returns: v.object({
		hasDiscordInvite: v.boolean(),
		inviteCodes: v.array(v.string()),
		isOnAnswerOverflow: v.boolean(),
		serverName: v.optional(v.string()),
	}),
	handler: async (ctx, args): Promise<DiscordInviteInfo> => {
		const readme = await fetchRepoReadme(args.owner, args.repo);
		if (!readme) {
			return {
				hasDiscordInvite: false,
				inviteCodes: [],
				isOnAnswerOverflow: false,
			};
		}

		const allUrls = readme.match(URL_REGEX) ?? [];
		const uniqueUrls = [...new Set(allUrls)].slice(0, 30);

		if (uniqueUrls.length === 0) {
			return {
				hasDiscordInvite: false,
				inviteCodes: [],
				isOnAnswerOverflow: false,
			};
		}

		const validInviteOption = await Effect.runPromise(
			findFirstValidDiscordInvite(uniqueUrls),
		);

		if (Option.isNone(validInviteOption)) {
			return {
				hasDiscordInvite: false,
				inviteCodes: [],
				isOnAnswerOverflow: false,
			};
		}

		const validInvite = validInviteOption.value;

		const server = await ctx.runQuery(
			internal.private.servers.getServerByDiscordIdInternal,
			{ discordId: BigInt(validInvite.guildId) },
		);

		return {
			hasDiscordInvite: true,
			inviteCodes: [validInvite.code],
			isOnAnswerOverflow: server !== null,
			serverName: validInvite.guildName,
		};
	},
});
