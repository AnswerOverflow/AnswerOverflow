import { type Infer, v } from "convex/values";
import { Octokit } from "octokit";
import { z } from "zod";
import { components } from "../../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../client";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

const GITHUB_REPO_NAME_REGEX = /^[\w.-]+$/;
const GITHUB_ISSUE_TITLE_MAX_LENGTH = 256;
const GITHUB_ISSUE_BODY_MAX_LENGTH = 65536;
const MAX_REPOS_PER_INSTALLATION = 500;

export const GitHubErrorCodes = {
	NOT_LINKED: "NOT_LINKED",
	NO_TOKEN: "NO_TOKEN",
	REFRESH_REQUIRED: "REFRESH_REQUIRED",
	REFRESH_FAILED: "REFRESH_FAILED",
	FETCH_FAILED: "FETCH_FAILED",
	CREATE_FAILED: "CREATE_FAILED",
	USER_NOT_FOUND: "USER_NOT_FOUND",
	INVALID_REPO: "INVALID_REPO",
	INVALID_INPUT: "INVALID_INPUT",
	RATE_LIMITED: "RATE_LIMITED",
} as const;

export type GitHubErrorCode =
	(typeof GitHubErrorCodes)[keyof typeof GitHubErrorCodes];

const githubAccountSchema = z.object({
	_id: z.string(),
	accountId: z.string(),
	providerId: z.literal("github"),
	userId: z.string(),
	accessToken: z.string().nullish(),
	refreshToken: z.string().nullish(),
	accessTokenExpiresAt: z.number().nullish(),
	scope: z.string().nullish(),
});

const accountWithUserIdSchema = z.object({
	userId: z.string(),
});

const betterAuthAccountSchema = v.object({
	_id: v.string(),
	accountId: v.string(),
	providerId: v.string(),
	userId: v.string(),
	accessToken: v.optional(v.union(v.null(), v.string())),
	refreshToken: v.optional(v.union(v.null(), v.string())),
	idToken: v.optional(v.union(v.null(), v.string())),
	accessTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
	refreshTokenExpiresAt: v.optional(v.union(v.null(), v.number())),
	scope: v.optional(v.union(v.null(), v.string())),
	password: v.optional(v.union(v.null(), v.string())),
	createdAt: v.number(),
	updatedAt: v.number(),
});

export type GitHubAccountWithRefresh = Pick<
	Infer<typeof betterAuthAccountSchema>,
	| "_id"
	| "accountId"
	| "userId"
	| "accessToken"
	| "refreshToken"
	| "accessTokenExpiresAt"
	| "scope"
> & {
	accessToken: string | null;
	refreshToken: string | null;
	accessTokenExpiresAt: number | null;
	scope: string | null;
};

export type GitHubAccountToken = Pick<
	GitHubAccountWithRefresh,
	"accountId" | "accessToken" | "scope"
>;

export type GitHubRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: boolean;
	installationId: number;
};

export type GitHubCreateIssueResult = {
	id: number;
	number: number;
	htmlUrl: string;
	title: string;
};

export type CreateOctokitClientResult =
	| { success: true; octokit: Octokit }
	| { success: false; error: string; code: GitHubErrorCode };

export function validateRepoOwnerAndName(
	owner: string,
	repo: string,
): { valid: true } | { valid: false; error: string } {
	if (!GITHUB_REPO_NAME_REGEX.test(owner)) {
		return { valid: false, error: "Invalid repository owner" };
	}
	if (!GITHUB_REPO_NAME_REGEX.test(repo)) {
		return { valid: false, error: "Invalid repository name" };
	}
	return { valid: true };
}

export function validateIssueTitleAndBody(
	title: string,
	body: string,
): { valid: true } | { valid: false; error: string } {
	if (title.length === 0) {
		return { valid: false, error: "Issue title cannot be empty" };
	}
	if (title.length > GITHUB_ISSUE_TITLE_MAX_LENGTH) {
		return {
			valid: false,
			error: `Issue title cannot exceed ${GITHUB_ISSUE_TITLE_MAX_LENGTH} characters (got ${title.length})`,
		};
	}
	if (body.length > GITHUB_ISSUE_BODY_MAX_LENGTH) {
		return {
			valid: false,
			error: `Issue body cannot exceed ${GITHUB_ISSUE_BODY_MAX_LENGTH} characters (got ${body.length})`,
		};
	}
	return { valid: true };
}

export async function getBetterAuthUserIdByDiscordId(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	discordId: bigint,
): Promise<string | null> {
	const discordAccountResult = await ctx.runQuery(
		components.betterAuth.adapter.findOne,
		{
			model: "account",
			where: [
				{
					field: "accountId",
					operator: "eq",
					value: discordId.toString(),
				},
				{
					field: "providerId",
					operator: "eq",
					value: "discord",
				},
			],
		},
	);

	const parsed = accountWithUserIdSchema.safeParse(discordAccountResult);
	if (!parsed.success) {
		return null;
	}

	return parsed.data.userId;
}

export async function getGitHubAccountByUserId(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	userId: string,
): Promise<GitHubAccountWithRefresh | null> {
	const accountResult = await ctx.runQuery(
		components.betterAuth.adapter.findOne,
		{
			model: "account",
			where: [
				{
					field: "userId",
					operator: "eq",
					value: userId,
				},
				{
					field: "providerId",
					operator: "eq",
					value: "github",
				},
			],
		},
	);

	const parsed = githubAccountSchema.safeParse(accountResult);
	if (!parsed.success) {
		return null;
	}

	return {
		_id: parsed.data._id,
		accountId: parsed.data.accountId,
		userId: parsed.data.userId,
		accessToken: parsed.data.accessToken ?? null,
		refreshToken: parsed.data.refreshToken ?? null,
		accessTokenExpiresAt: parsed.data.accessTokenExpiresAt ?? null,
		scope: parsed.data.scope ?? null,
	};
}

export async function getGitHubAccountByDiscordId(
	ctx: QueryCtx | MutationCtx | ActionCtx,
	discordId: bigint,
): Promise<GitHubAccountWithRefresh | null> {
	const userId = await getBetterAuthUserIdByDiscordId(ctx, discordId);
	if (!userId) {
		return null;
	}
	return getGitHubAccountByUserId(ctx, userId);
}

type RefreshedTokens = {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: number;
};

async function updateGitHubAccountTokens(
	ctx: ActionCtx,
	githubAccountId: string,
	tokens: RefreshedTokens,
): Promise<void> {
	await ctx.runMutation(components.betterAuth.adapter.updateOne, {
		input: {
			model: "account",
			where: [
				{
					field: "accountId",
					operator: "eq",
					value: githubAccountId,
				},
				{
					field: "providerId",
					operator: "eq",
					value: "github",
				},
			],
			update: {
				accessToken: tokens.accessToken,
				refreshToken: tokens.refreshToken,
				accessTokenExpiresAt: tokens.accessTokenExpiresAt,
				updatedAt: Date.now(),
			},
		},
	});
}

const githubTokenRefreshResponseSchema = z.object({
	access_token: z.string(),
	refresh_token: z.string(),
	expires_in: z.number(),
	refresh_token_expires_in: z.number(),
	error: z.string().optional(),
	error_description: z.string().optional(),
});

function isTokenExpired(expiresAt: number | null): boolean {
	if (expiresAt === null) return false;
	return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
}

async function refreshGitHubToken(
	ctx: ActionCtx,
	account: GitHubAccountWithRefresh,
	clientId: string,
	clientSecret: string,
): Promise<
	| { success: true; accessToken: string }
	| { success: false; error: string; code: GitHubErrorCode }
> {
	if (!account.refreshToken) {
		return {
			success: false,
			error: "No refresh token available",
			code: GitHubErrorCodes.NO_TOKEN,
		};
	}

	try {
		// TODO: Replace manual fetch with Octokit's OAuth handling
		// Consider using @octokit/oauth-app or Octokit's built-in token refresh methods
		// instead of manual GitHub API calls for better error handling and type safety
		const response = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					Accept: "application/json",
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					client_id: clientId,
					client_secret: clientSecret,
					grant_type: "refresh_token",
					refresh_token: account.refreshToken,
				}),
			},
		);

		const rawData = await response.json();
		const parseResult = githubTokenRefreshResponseSchema.safeParse(rawData);

		if (!parseResult.success) {
			return {
				success: false,
				error: `Invalid token response from GitHub: ${parseResult.error.message}`,
				code: GitHubErrorCodes.REFRESH_FAILED,
			};
		}

		const data = parseResult.data;

		if (data.error) {
			return {
				success: false,
				error: `${data.error_description ?? data.error}`,
				code: GitHubErrorCodes.REFRESH_FAILED,
			};
		}

		const now = Date.now();
		const accessTokenExpiresAt = now + data.expires_in * 1000;

		await updateGitHubAccountTokens(ctx, account.accountId, {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			accessTokenExpiresAt,
		});

		return { success: true, accessToken: data.access_token };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : "Failed to refresh token",
			code: GitHubErrorCodes.REFRESH_FAILED,
		};
	}
}

export async function createOctokitClient(
	ctx: ActionCtx,
	account: GitHubAccountWithRefresh,
): Promise<CreateOctokitClientResult> {
	const clientId = process.env.GITHUB_CLIENT_ID;
	const clientSecret = process.env.GITHUB_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		return {
			success: false,
			error: "GitHub App credentials not configured",
			code: GitHubErrorCodes.REFRESH_FAILED,
		};
	}

	if (!account.accessToken) {
		return {
			success: false,
			error: "No access token available",
			code: GitHubErrorCodes.NO_TOKEN,
		};
	}

	if (!account.refreshToken) {
		return {
			success: false,
			error: "No refresh token available",
			code: GitHubErrorCodes.NO_TOKEN,
		};
	}

	let accessToken = account.accessToken;

	if (isTokenExpired(account.accessTokenExpiresAt)) {
		const refreshResult = await refreshGitHubToken(
			ctx,
			account,
			clientId,
			clientSecret,
		);

		if (!refreshResult.success) {
			return refreshResult;
		}

		accessToken = refreshResult.accessToken;
	}

	const octokit = new Octokit({ auth: accessToken });

	return { success: true, octokit };
}

export async function fetchGitHubInstallationRepos(
	octokit: Octokit,
): Promise<{ repos: Array<GitHubRepo>; hasAllReposAccess: boolean }> {
	const { data: installationsData } =
		await octokit.rest.apps.listInstallationsForAuthenticatedUser();

	const repos: Array<GitHubRepo> = [];
	let hasAllReposAccess = installationsData.installations.length > 0;

	for (const installation of installationsData.installations) {
		if (installation.repository_selection !== "all") {
			hasAllReposAccess = false;
		}

		const allRepos: Array<GitHubRepo> = [];
		let page = 1;

		// TODO: GitHub's search API exists but is not suitable for this use case.
		// The search API is for finding repositories by name/content across GitHub,
		// but here we need to list all repositories accessible to a specific GitHub App installation.
		// The current pagination approach using listInstallationReposForAuthenticatedUser
		// is the correct and only way to get installation-specific repository access.
		// GitHub's search API cannot filter by installation access permissions.
		while (allRepos.length < MAX_REPOS_PER_INSTALLATION) {
			const { data: reposData } =
				await octokit.rest.apps.listInstallationReposForAuthenticatedUser({
					installation_id: installation.id,
					per_page: 100,
					page,
				});

			for (const repo of reposData.repositories) {
				allRepos.push({
					id: repo.id,
					name: repo.name,
					fullName: repo.full_name,
					owner: repo.owner.login,
					private: repo.private,
					installationId: installation.id,
				});
			}

			if (reposData.repositories.length < 100) {
				break;
			}
			page++;
		}

		repos.push(...allRepos);
	}

	return { repos, hasAllReposAccess };
}

export async function createGitHubIssue(
	octokit: Octokit,
	owner: string,
	repo: string,
	title: string,
	body: string,
): Promise<GitHubCreateIssueResult> {
	const { data } = await octokit.rest.issues.create({
		owner,
		repo,
		title,
		body,
	});

	return {
		id: data.id,
		number: data.number,
		htmlUrl: data.html_url,
		title: data.title,
	};
}

export type GitHubSearchRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: boolean;
	description: string | null;
	stargazersCount: number;
	language: string | null;
};

export async function searchGitHubRepositories(
	octokit: Octokit,
	query: string,
	org?: string,
): Promise<Array<GitHubSearchRepo>> {
	const searchQuery = org ? `${query} org:${org}` : query;

	const { data } = await octokit.rest.search.repos({
		q: searchQuery,
		per_page: 20,
		sort: "stars",
		order: "desc",
	});

	return data.items.map((repo) => ({
		id: repo.id,
		name: repo.name,
		fullName: repo.full_name,
		owner: repo.owner?.login ?? "",
		private: repo.private ?? false,
		description: repo.description,
		stargazersCount: repo.stargazers_count ?? 0,
		language: repo.language,
	}));
}

export async function getOrgPopularRepos(
	octokit: Octokit,
	org: string,
): Promise<Array<GitHubSearchRepo>> {
	const { data } = await octokit.rest.search.repos({
		q: `org:${org}`,
		per_page: 20,
		sort: "stars",
		order: "desc",
	});

	return data.items.map((repo) => ({
		id: repo.id,
		name: repo.name,
		fullName: repo.full_name,
		owner: repo.owner?.login ?? "",
		private: repo.private ?? false,
		description: repo.description,
		stargazersCount: repo.stargazers_count ?? 0,
		language: repo.language,
	}));
}

export async function getFeaturedRepos(
	octokit: Octokit,
): Promise<Array<GitHubSearchRepo>> {
	const { data } = await octokit.rest.search.repos({
		q: "stars:>50000",
		per_page: 20,
		sort: "stars",
		order: "desc",
	});

	return data.items.map((repo) => ({
		id: repo.id,
		name: repo.name,
		fullName: repo.full_name,
		owner: repo.owner?.login ?? "",
		private: repo.private ?? false,
		description: repo.description,
		stargazersCount: repo.stargazers_count ?? 0,
		language: repo.language,
	}));
}
