import { z } from "zod";
import { components } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

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

export function isGitHubTokenExpired(expiresAt: number | null): boolean {
	if (expiresAt === null) {
		return false;
	}
	const now = Date.now();
	return expiresAt - TOKEN_EXPIRY_BUFFER_MS <= now;
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

const githubTokenResponseSchema = z.object({
	access_token: z.string(),
	expires_in: z.number(),
	refresh_token: z.string(),
	refresh_token_expires_in: z.number(),
	token_type: z.string(),
	scope: z.string(),
});

export type GitHubTokenRefreshResult = {
	accessToken: string;
	refreshToken: string;
	accessTokenExpiresAt: number;
	scope: string;
};

export async function refreshGitHubToken(
	refreshToken: string,
): Promise<GitHubTokenRefreshResult> {
	const clientId = process.env.GITHUB_APP_CLIENT_ID;
	const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

	if (!clientId || !clientSecret) {
		throw new Error("GitHub App credentials not configured");
	}

	const response = await fetch("https://github.com/login/oauth/access_token", {
		method: "POST",
		headers: {
			Accept: "application/json",
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			client_id: clientId,
			client_secret: clientSecret,
			grant_type: "refresh_token",
			refresh_token: refreshToken,
		}),
	});

	if (!response.ok) {
		throw new Error(`GitHub token refresh failed: ${response.status}`);
	}

	const data: unknown = await response.json();
	const parsed = githubTokenResponseSchema.safeParse(data);

	if (!parsed.success) {
		if (
			typeof data === "object" &&
			data !== null &&
			"error" in data &&
			typeof data.error === "string"
		) {
			throw new Error(`GitHub token refresh error: ${data.error}`);
		}
		throw new Error("Invalid response from GitHub token refresh");
	}

	return {
		accessToken: parsed.data.access_token,
		refreshToken: parsed.data.refresh_token,
		accessTokenExpiresAt: Date.now() + parsed.data.expires_in * 1000,
		scope: parsed.data.scope,
	};
}

export async function updateGitHubAccountTokens(
	ctx: ActionCtx,
	githubAccountId: string,
	tokens: GitHubTokenRefreshResult,
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
				scope: tokens.scope,
				updatedAt: Date.now(),
			},
		},
	});
}

export type GitHubRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: boolean;
	installationId: number;
};

const githubInstallationsResponseSchema = z.object({
	installations: z.array(
		z.object({
			id: z.number(),
			account: z.object({
				login: z.string(),
			}),
			repository_selection: z.enum(["all", "selected"]),
		}),
	),
});

const githubReposResponseSchema = z.object({
	repositories: z.array(
		z.object({
			id: z.number(),
			name: z.string(),
			full_name: z.string(),
			owner: z.object({
				login: z.string(),
			}),
			private: z.boolean(),
		}),
	),
});

export async function fetchGitHubInstallationRepos(
	accessToken: string,
): Promise<{ repos: Array<GitHubRepo>; hasAllReposAccess: boolean }> {
	const installationsResponse = await fetch(
		"https://api.github.com/user/installations",
		{
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!installationsResponse.ok) {
		if (installationsResponse.status === 401) {
			throw new Error("GitHub token expired or invalid");
		}
		throw new Error(
			`Failed to fetch GitHub installations: ${installationsResponse.status}`,
		);
	}

	const installationsData = await installationsResponse.json();
	const installationsParsed =
		githubInstallationsResponseSchema.safeParse(installationsData);

	if (!installationsParsed.success) {
		throw new Error("Invalid response from GitHub installations API");
	}

	const repos: Array<GitHubRepo> = [];
	let hasAllReposAccess = installationsParsed.data.installations.length > 0;

	for (const installation of installationsParsed.data.installations) {
		if (installation.repository_selection !== "all") {
			hasAllReposAccess = false;
		}

		const reposResponse = await fetch(
			`https://api.github.com/user/installations/${installation.id}/repositories`,
			{
				headers: {
					Authorization: `Bearer ${accessToken}`,
					Accept: "application/vnd.github+json",
					"X-GitHub-Api-Version": "2022-11-28",
				},
			},
		);

		if (!reposResponse.ok) {
			console.error(
				`Failed to fetch repos for installation ${installation.id}: ${reposResponse.status}`,
			);
			continue;
		}

		const reposData = await reposResponse.json();
		const reposParsed = githubReposResponseSchema.safeParse(reposData);

		if (!reposParsed.success) {
			console.error(
				`Invalid repos response for installation ${installation.id}`,
			);
			continue;
		}

		for (const repo of reposParsed.data.repositories) {
			repos.push({
				id: repo.id,
				name: repo.name,
				fullName: repo.full_name,
				owner: repo.owner.login,
				private: repo.private,
				installationId: installation.id,
			});
		}
	}

	return { repos, hasAllReposAccess };
}

const githubCreateIssueResponseSchema = z.object({
	id: z.number(),
	number: z.number(),
	html_url: z.string(),
	title: z.string(),
});

export type GitHubCreateIssueResult = {
	id: number;
	number: number;
	htmlUrl: string;
	title: string;
};

export async function createGitHubIssue(
	accessToken: string,
	owner: string,
	repo: string,
	title: string,
	body: string,
): Promise<GitHubCreateIssueResult> {
	const response = await fetch(
		`https://api.github.com/repos/${owner}/${repo}/issues`,
		{
			method: "POST",
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
				"Content-Type": "application/json",
			},
			body: JSON.stringify({ title, body }),
		},
	);

	if (!response.ok) {
		const errorText = await response.text().catch(() => "");
		throw new Error(
			`Failed to create GitHub issue: ${response.status} ${errorText}`,
		);
	}

	const data = await response.json();
	const parsed = githubCreateIssueResponseSchema.safeParse(data);

	if (!parsed.success) {
		throw new Error("Invalid response from GitHub create issue API");
	}

	return {
		id: parsed.data.id,
		number: parsed.data.number,
		htmlUrl: parsed.data.html_url,
		title: parsed.data.title,
	};
}
