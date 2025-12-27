import { Octokit } from "octokit";
import {
	createOAuthUserAuth,
	type GitHubAppAuthenticationWithExpiration,
} from "@octokit/auth-oauth-user";
import { z } from "zod";
import { components } from "../../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../../client";

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

export type GitHubAccountWithRefresh = {
	_id: string;
	accountId: string;
	userId: string;
	accessToken: string | null;
	refreshToken: string | null;
	accessTokenExpiresAt: number | null;
	scope: string | null;
};

export type GitHubAccountToken = {
	accountId: string;
	accessToken: string | null;
	scope: string | null;
};

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

async function updateGitHubAccountTokens(
	ctx: ActionCtx,
	githubAccountId: string,
	tokens: GitHubAppAuthenticationWithExpiration,
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
				accessToken: tokens.token,
				refreshToken: tokens.refreshToken,
				accessTokenExpiresAt: new Date(tokens.expiresAt).getTime(),
				updatedAt: Date.now(),
			},
		},
	});
}

export function createOctokitClient(
	ctx: ActionCtx,
	account: GitHubAccountWithRefresh,
): CreateOctokitClientResult {
	const clientId = process.env.GITHUB_APP_CLIENT_ID;
	const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

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

	const octokit = new Octokit({
		authStrategy: createOAuthUserAuth,
		auth: {
			clientId,
			clientSecret,
			clientType: "github-app",
			token: account.accessToken,
			refreshToken: account.refreshToken,
			expiresAt: account.accessTokenExpiresAt
				? new Date(account.accessTokenExpiresAt).toISOString()
				: undefined,
			onTokenCreated: (
				newTokens: GitHubAppAuthenticationWithExpiration | undefined,
			) => {
				if (!newTokens) return;
				updateGitHubAccountTokens(ctx, account.accountId, newTokens).catch(
					(error) => {
						console.error("Failed to persist refreshed GitHub tokens:", error);
					},
				);
			},
		},
	});

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
