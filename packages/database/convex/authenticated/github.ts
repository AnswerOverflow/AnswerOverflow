import { v } from "convex/values";
import { internal } from "../_generated/api";
import { anonOrAuthenticatedQuery, authenticatedAction } from "../client";
import { authComponent } from "../shared/betterAuth";
import {
	createGitHubIssue,
	createOctokitClient,
	fetchGitHubInstallationRepos,
	type GitHubErrorCode,
	GitHubErrorCodes,
	getBetterAuthUserIdByDiscordId,
	getFeaturedRepos,
	getGitHubAccountByDiscordId,
	getGitHubAccountByUserId,
	getOrgPopularRepos,
	searchGitHubRepositories,
	validateIssueTitleAndBody,
	validateRepoOwnerAndName,
} from "../shared/github";

export const getGitHubAccount = anonOrAuthenticatedQuery({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return null;
		}

		const account = await getGitHubAccountByUserId(ctx, user._id);
		if (!account) {
			return null;
		}

		return {
			accountId: account.accountId,
			isConnected: true,
		};
	},
});

export const getAccessibleRepos = authenticatedAction({
	args: {},
	handler: async (
		ctx,
		args,
	): Promise<
		| { success: false; error: string; code: GitHubErrorCode }
		| {
				success: true;
				repos: Array<{
					id: number;
					name: string;
					fullName: string;
					owner: string;
					private: boolean;
					installationId: number;
				}>;
				hasAllReposAccess: boolean;
		  }
	> => {
		const { discordAccountId } = args;

		const userId = await getBetterAuthUserIdByDiscordId(ctx, discordAccountId);
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

		const account = await getGitHubAccountByDiscordId(ctx, discordAccountId);

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

export const searchRepos = authenticatedAction({
	args: {
		query: v.string(),
		org: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByDiscordId(
			ctx,
			args.discordAccountId,
		);

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
			const repos = await searchGitHubRepositories(
				octokitResult.octokit,
				args.query,
				args.org,
			);

			return {
				success: true as const,
				repos,
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error ? error.message : "Failed to search repos",
				code: GitHubErrorCodes.FETCH_FAILED,
			};
		}
	},
});

export const getOrgRepos = authenticatedAction({
	args: {
		org: v.string(),
	},
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByDiscordId(
			ctx,
			args.discordAccountId,
		);

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
			const repos = await getOrgPopularRepos(octokitResult.octokit, args.org);

			return {
				success: true as const,
				repos,
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error ? error.message : "Failed to get org repos",
				code: GitHubErrorCodes.FETCH_FAILED,
			};
		}
	},
});

export const getFeatured = authenticatedAction({
	args: {},
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByDiscordId(
			ctx,
			args.discordAccountId,
		);

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
			const repos = await getFeaturedRepos(octokitResult.octokit);

			return {
				success: true as const,
				repos,
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error
						? error.message
						: "Failed to get featured repos",
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

export const createIssue = authenticatedAction({
	args: {
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
		const { discordAccountId } = args;

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

		const userId = await getBetterAuthUserIdByDiscordId(ctx, discordAccountId);
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

		const account = await getGitHubAccountByDiscordId(ctx, discordAccountId);

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
