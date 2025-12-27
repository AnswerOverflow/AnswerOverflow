import { Data, Effect } from "effect";
import { z } from "zod";
import { components } from "../_generated/api";
import type { ActionCtx, MutationCtx, QueryCtx } from "../client";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;
const GITHUB_REPO_NAME_REGEX = /^[\w.-]+$/;
const GITHUB_ISSUE_TITLE_MAX_LENGTH = 256;
const GITHUB_ISSUE_BODY_MAX_LENGTH = 65536;

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

export class NoAccessTokenError extends Data.TaggedError("NoAccessTokenError")<{
	readonly message: string;
}> {
	readonly code = GitHubErrorCodes.NO_TOKEN;
}

export class TokenExpiredError extends Data.TaggedError("TokenExpiredError")<{
	readonly message: string;
}> {
	readonly code = GitHubErrorCodes.REFRESH_REQUIRED;
}

export class TokenRefreshError extends Data.TaggedError("TokenRefreshError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {
	readonly code = GitHubErrorCodes.REFRESH_FAILED;
}

export class GitHubCredentialsError extends Data.TaggedError(
	"GitHubCredentialsError",
)<{
	readonly message: string;
}> {
	readonly code = GitHubErrorCodes.REFRESH_FAILED;
}

export class GitHubAPIResponseError extends Data.TaggedError(
	"GitHubAPIResponseError",
)<{
	readonly message: string;
	readonly status: number;
}> {
	readonly code = GitHubErrorCodes.FETCH_FAILED;
}

export class InvalidGitHubResponseError extends Data.TaggedError(
	"InvalidGitHubResponseError",
)<{
	readonly message: string;
	readonly error?: string;
}> {
	readonly code = GitHubErrorCodes.REFRESH_FAILED;
}

export type GitHubTokenError =
	| NoAccessTokenError
	| TokenExpiredError
	| TokenRefreshError
	| GitHubCredentialsError
	| GitHubAPIResponseError
	| InvalidGitHubResponseError;

export class GitHubAPIError extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly code: GitHubErrorCode = "FETCH_FAILED",
	) {
		super(message);
		this.name = "GitHubAPIError";
	}
}

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

export const refreshGitHubTokenEffect = (
	refreshToken: string,
): Effect.Effect<
	GitHubTokenRefreshResult,
	GitHubCredentialsError | GitHubAPIResponseError | InvalidGitHubResponseError
> =>
	Effect.gen(function* () {
		const clientId = process.env.GITHUB_APP_CLIENT_ID;
		const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			return yield* new GitHubCredentialsError({
				message: "GitHub App credentials not configured",
			});
		}

		const response = yield* Effect.tryPromise({
			try: () =>
				fetch("https://github.com/login/oauth/access_token", {
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
				}),
			catch: (error) =>
				new GitHubAPIResponseError({
					message:
						error instanceof Error
							? error.message
							: "Failed to connect to GitHub",
					status: 0,
				}),
		});

		if (!response.ok) {
			return yield* new GitHubAPIResponseError({
				message: `GitHub token refresh failed: ${response.status}`,
				status: response.status,
			});
		}

		const data: unknown = yield* Effect.tryPromise({
			try: () => response.json(),
			catch: () =>
				new InvalidGitHubResponseError({
					message: "Failed to parse GitHub response",
				}),
		});

		const parsed = githubTokenResponseSchema.safeParse(data);

		if (!parsed.success) {
			if (
				typeof data === "object" &&
				data !== null &&
				"error" in data &&
				typeof data.error === "string"
			) {
				return yield* new InvalidGitHubResponseError({
					message: `GitHub token refresh error: ${data.error}`,
					error: data.error,
				});
			}
			return yield* new InvalidGitHubResponseError({
				message: "Invalid response from GitHub token refresh",
			});
		}

		return {
			accessToken: parsed.data.access_token,
			refreshToken: parsed.data.refresh_token,
			accessTokenExpiresAt: Date.now() + parsed.data.expires_in * 1000,
			scope: parsed.data.scope,
		};
	});

export async function refreshGitHubToken(
	refreshToken: string,
): Promise<GitHubTokenRefreshResult> {
	return Effect.runPromise(
		refreshGitHubTokenEffect(refreshToken).pipe(
			Effect.mapError((error) => new Error(error.message)),
			Effect.catchAll((error) => Effect.die(error)),
		),
	);
}

export class TokenUpdateError extends Data.TaggedError("TokenUpdateError")<{
	readonly message: string;
	readonly cause?: unknown;
}> {
	readonly code = GitHubErrorCodes.REFRESH_FAILED;
}

export const updateGitHubAccountTokensEffect = (
	ctx: ActionCtx,
	githubAccountId: string,
	tokens: GitHubTokenRefreshResult,
): Effect.Effect<void, TokenUpdateError> =>
	Effect.tryPromise({
		try: () =>
			ctx.runMutation(components.betterAuth.adapter.updateOne, {
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
			}),
		catch: (error) =>
			new TokenUpdateError({
				message: "Failed to update GitHub account tokens",
				cause: error,
			}),
	}).pipe(Effect.asVoid);

export async function updateGitHubAccountTokens(
	ctx: ActionCtx,
	githubAccountId: string,
	tokens: GitHubTokenRefreshResult,
): Promise<void> {
	return Effect.runPromise(
		updateGitHubAccountTokensEffect(ctx, githubAccountId, tokens).pipe(
			Effect.catchAll((error) => Effect.die(new Error(error.message))),
		),
	);
}

export type GetValidAccessTokenResult =
	| { success: true; accessToken: string }
	| { success: false; error: string; code: GitHubErrorCode };

export type GetValidAccessTokenError =
	| NoAccessTokenError
	| TokenExpiredError
	| TokenRefreshError
	| TokenUpdateError
	| GitHubCredentialsError
	| GitHubAPIResponseError
	| InvalidGitHubResponseError;

export const getValidAccessTokenEffect = (
	ctx: ActionCtx,
	account: GitHubAccountWithRefresh,
): Effect.Effect<string, GetValidAccessTokenError> =>
	Effect.gen(function* () {
		if (!account.accessToken) {
			return yield* new NoAccessTokenError({
				message: "No access token available",
			});
		}

		if (!isGitHubTokenExpired(account.accessTokenExpiresAt)) {
			return account.accessToken;
		}

		if (!account.refreshToken) {
			return yield* new TokenExpiredError({
				message: "Token expired and no refresh token available",
			});
		}

		const newTokens = yield* refreshGitHubTokenEffect(account.refreshToken);
		yield* updateGitHubAccountTokensEffect(ctx, account.accountId, newTokens);

		return newTokens.accessToken;
	});

export async function getValidAccessToken(
	ctx: ActionCtx,
	account: GitHubAccountWithRefresh,
): Promise<GetValidAccessTokenResult> {
	return Effect.runPromise(
		getValidAccessTokenEffect(ctx, account).pipe(
			Effect.map((accessToken) => ({
				success: true as const,
				accessToken,
			})),
			Effect.catchAll((error) =>
				Effect.succeed({
					success: false as const,
					error: error.message,
					code: error.code,
				}),
			),
		),
	);
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
	total_count: z.number().optional(),
});

const MAX_REPOS_PER_INSTALLATION = 500;
const REPOS_PER_PAGE = 100;

function parseGitHubLinkHeader(linkHeader: string | null): string | null {
	if (!linkHeader) return null;

	const links = linkHeader.split(",").map((link) => link.trim());
	for (const link of links) {
		const match = link.match(/<([^>]+)>;\s*rel="next"/);
		if (match?.[1]) {
			return match[1];
		}
	}
	return null;
}

async function fetchAllPaginatedRepos(
	accessToken: string,
	installationId: number,
): Promise<
	Array<{
		id: number;
		name: string;
		full_name: string;
		owner: { login: string };
		private: boolean;
	}>
> {
	const allRepos: Array<{
		id: number;
		name: string;
		full_name: string;
		owner: { login: string };
		private: boolean;
	}> = [];

	let url: string | null =
		`https://api.github.com/user/installations/${installationId}/repositories?per_page=${REPOS_PER_PAGE}`;

	while (url && allRepos.length < MAX_REPOS_PER_INSTALLATION) {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${accessToken}`,
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		});

		if (!response.ok) {
			console.error(
				`Failed to fetch repos for installation ${installationId}: ${response.status}`,
			);
			break;
		}

		const data = await response.json();
		const parsed = githubReposResponseSchema.safeParse(data);

		if (!parsed.success) {
			console.error(
				`Invalid repos response for installation ${installationId}`,
			);
			break;
		}

		allRepos.push(...parsed.data.repositories);
		url = parseGitHubLinkHeader(response.headers.get("link"));
	}

	return allRepos;
}

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

		const installationRepos = await fetchAllPaginatedRepos(
			accessToken,
			installation.id,
		);

		for (const repo of installationRepos) {
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
