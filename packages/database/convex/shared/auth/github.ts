import {
	FetchHttpClient,
	HttpClient,
	HttpClientRequest,
} from "@effect/platform";
import type { GenericActionCtx } from "convex/server";
import { Array as Arr, Data, Effect, Option, Schema } from "effect";
import { make, type Client } from "@packages/github-api/generated";
import type { DataModel } from "../../_generated/dataModel";
import { BetterAuthAccounts, type GitHubAccount } from "./betterAuthService";

const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

const GITHUB_REPO_NAME_REGEX = /^[\w.-]+$/;
const GITHUB_ISSUE_TITLE_MAX_LENGTH = 256;
const GITHUB_ISSUE_BODY_MAX_LENGTH = 65536;
const MAX_REPOS_PER_INSTALLATION = 500;

export class GitHubNotLinkedError extends Data.TaggedError(
	"GitHubNotLinkedError",
)<{
	readonly message: string;
}> {}

export class GitHubNoTokenError extends Data.TaggedError("GitHubNoTokenError")<{
	readonly message: string;
}> {}

export class GitHubRefreshFailedError extends Data.TaggedError(
	"GitHubRefreshFailedError",
)<{
	readonly message: string;
}> {}

export class GitHubFetchFailedError extends Data.TaggedError(
	"GitHubFetchFailedError",
)<{
	readonly message: string;
}> {}

export class GitHubCreateFailedError extends Data.TaggedError(
	"GitHubCreateFailedError",
)<{
	readonly message: string;
}> {}

export class GitHubUserNotFoundError extends Data.TaggedError(
	"GitHubUserNotFoundError",
)<{
	readonly message: string;
}> {}

export class GitHubInvalidRepoError extends Data.TaggedError(
	"GitHubInvalidRepoError",
)<{
	readonly message: string;
}> {}

export class GitHubInvalidInputError extends Data.TaggedError(
	"GitHubInvalidInputError",
)<{
	readonly message: string;
}> {}

export class GitHubRateLimitedError extends Data.TaggedError(
	"GitHubRateLimitedError",
)<{
	readonly message: string;
	readonly retryAfterSeconds: number;
}> {}

export class GitHubCredentialsNotConfiguredError extends Data.TaggedError(
	"GitHubCredentialsNotConfiguredError",
)<{
	readonly message: string;
}> {}

export class NotAuthenticatedError extends Data.TaggedError(
	"NotAuthenticatedError",
)<{
	readonly message: string;
}> {}

export const GitHubNotLinkedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubNotLinkedError"),
	message: Schema.String,
});

export const GitHubNoTokenErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubNoTokenError"),
	message: Schema.String,
});

export const GitHubRefreshFailedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubRefreshFailedError"),
	message: Schema.String,
});

export const GitHubFetchFailedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubFetchFailedError"),
	message: Schema.String,
});

export const GitHubCreateFailedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubCreateFailedError"),
	message: Schema.String,
});

export const GitHubUserNotFoundErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubUserNotFoundError"),
	message: Schema.String,
});

export const GitHubInvalidRepoErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubInvalidRepoError"),
	message: Schema.String,
});

export const GitHubInvalidInputErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubInvalidInputError"),
	message: Schema.String,
});

export const GitHubRateLimitedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubRateLimitedError"),
	message: Schema.String,
	retryAfterSeconds: Schema.Number,
});

export const GitHubCredentialsNotConfiguredErrorSchema = Schema.Struct({
	_tag: Schema.Literal("GitHubCredentialsNotConfiguredError"),
	message: Schema.String,
});

export const NotAuthenticatedErrorSchema = Schema.Struct({
	_tag: Schema.Literal("NotAuthenticatedError"),
	message: Schema.String,
});

export const GetAccessibleReposErrorSchema = Schema.Union(
	GitHubNotLinkedErrorSchema,
	GitHubNoTokenErrorSchema,
	GitHubRefreshFailedErrorSchema,
	GitHubFetchFailedErrorSchema,
	GitHubCredentialsNotConfiguredErrorSchema,
	NotAuthenticatedErrorSchema,
	GitHubRateLimitedErrorSchema,
	GitHubUserNotFoundErrorSchema,
);

export type GetAccessibleReposError = Schema.Schema.Type<
	typeof GetAccessibleReposErrorSchema
>;

export const CreateGitHubIssueErrorSchema = Schema.Union(
	GitHubNotLinkedErrorSchema,
	GitHubNoTokenErrorSchema,
	GitHubRefreshFailedErrorSchema,
	GitHubCreateFailedErrorSchema,
	GitHubInvalidRepoErrorSchema,
	GitHubInvalidInputErrorSchema,
	GitHubCredentialsNotConfiguredErrorSchema,
	GitHubUserNotFoundErrorSchema,
	GitHubRateLimitedErrorSchema,
);

export type CreateGitHubIssueError = Schema.Schema.Type<
	typeof CreateGitHubIssueErrorSchema
>;

export type GitHubError =
	| GitHubNotLinkedError
	| GitHubNoTokenError
	| GitHubRefreshFailedError
	| GitHubFetchFailedError
	| GitHubCreateFailedError
	| GitHubUserNotFoundError
	| GitHubInvalidRepoError
	| GitHubInvalidInputError
	| GitHubRateLimitedError
	| GitHubCredentialsNotConfiguredError
	| NotAuthenticatedError;

export const serializeError = <E extends GitHubError>(
	error: E,
): E extends GitHubRateLimitedError
	? { _tag: E["_tag"]; message: string; retryAfterSeconds: number }
	: { _tag: E["_tag"]; message: string } => {
	if (error._tag === "GitHubRateLimitedError") {
		return {
			_tag: error._tag,
			message: error.message,
			retryAfterSeconds: (error as GitHubRateLimitedError).retryAfterSeconds,
		} as ReturnType<typeof serializeError<E>>;
	}
	return {
		_tag: error._tag,
		message: error.message,
	} as ReturnType<typeof serializeError<E>>;
};

export const GitHubAccountSchema = Schema.Struct({
	_id: Schema.String,
	accountId: Schema.String,
	userId: Schema.String,
	accessToken: Schema.NullOr(Schema.String),
	refreshToken: Schema.NullOr(Schema.String),
	accessTokenExpiresAt: Schema.NullOr(Schema.Number),
	scope: Schema.NullOr(Schema.String),
});

export type GitHubAccountWithRefresh = Schema.Schema.Type<
	typeof GitHubAccountSchema
>;

export const GitHubRepoSchema = Schema.Struct({
	id: Schema.Number,
	name: Schema.String,
	fullName: Schema.String,
	owner: Schema.String,
	private: Schema.Boolean,
	installationId: Schema.Number,
});

export type GitHubRepo = Schema.Schema.Type<typeof GitHubRepoSchema>;

export const GitHubCreateIssueResultSchema = Schema.Struct({
	id: Schema.Number,
	number: Schema.Number,
	htmlUrl: Schema.String,
	title: Schema.String,
});

export type GitHubCreateIssueResult = Schema.Schema.Type<
	typeof GitHubCreateIssueResultSchema
>;

export const GitHubInstallationReposResultSchema = Schema.Struct({
	repos: Schema.Array(GitHubRepoSchema),
	hasAllReposAccess: Schema.Boolean,
});

export type GitHubInstallationReposResult = Schema.Schema.Type<
	typeof GitHubInstallationReposResultSchema
>;

type ActionCtx = GenericActionCtx<DataModel>;

const toGitHubAccountWithRefresh = (
	account: GitHubAccount,
): GitHubAccountWithRefresh => ({
	_id: account._id,
	accountId: account.accountId,
	userId: account.userId,
	accessToken: account.accessToken ?? null,
	refreshToken: account.refreshToken ?? null,
	accessTokenExpiresAt: account.accessTokenExpiresAt ?? null,
	scope: account.scope ?? null,
});

export const validateRepoOwnerAndName = (
	owner: string,
	repo: string,
): Effect.Effect<void, GitHubInvalidRepoError> => {
	if (!GITHUB_REPO_NAME_REGEX.test(owner)) {
		return Effect.fail(
			new GitHubInvalidRepoError({ message: "Invalid repository owner" }),
		);
	}
	if (!GITHUB_REPO_NAME_REGEX.test(repo)) {
		return Effect.fail(
			new GitHubInvalidRepoError({ message: "Invalid repository name" }),
		);
	}
	return Effect.void;
};

export const validateIssueTitleAndBody = (
	title: string,
	body: string,
): Effect.Effect<void, GitHubInvalidInputError> => {
	if (title.length === 0) {
		return Effect.fail(
			new GitHubInvalidInputError({ message: "Issue title cannot be empty" }),
		);
	}
	if (title.length > GITHUB_ISSUE_TITLE_MAX_LENGTH) {
		return Effect.fail(
			new GitHubInvalidInputError({
				message: `Issue title cannot exceed ${GITHUB_ISSUE_TITLE_MAX_LENGTH} characters (got ${title.length})`,
			}),
		);
	}
	if (body.length > GITHUB_ISSUE_BODY_MAX_LENGTH) {
		return Effect.fail(
			new GitHubInvalidInputError({
				message: `Issue body cannot exceed ${GITHUB_ISSUE_BODY_MAX_LENGTH} characters (got ${body.length})`,
			}),
		);
	}
	return Effect.void;
};

export const getBetterAuthUserIdByDiscordId = (
	discordId: bigint,
): Effect.Effect<Option.Option<string>, never, BetterAuthAccounts> =>
	Effect.gen(function* () {
		const accounts = yield* BetterAuthAccounts;
		const discordAccountOption =
			yield* accounts.findDiscordAccountByDiscordId(discordId);
		return Option.map(discordAccountOption, (account) => account.userId);
	});

export const getGitHubAccountByUserId = (
	userId: string,
): Effect.Effect<
	Option.Option<GitHubAccountWithRefresh>,
	never,
	BetterAuthAccounts
> =>
	Effect.gen(function* () {
		const accounts = yield* BetterAuthAccounts;
		const accountOption = yield* accounts.findGitHubAccountByUserId(userId);
		return Option.map(accountOption, toGitHubAccountWithRefresh);
	});

export const getGitHubAccountByUserIdOrFail = (
	userId: string,
): Effect.Effect<
	GitHubAccountWithRefresh,
	GitHubNotLinkedError,
	BetterAuthAccounts
> =>
	Effect.gen(function* () {
		const accountOption = yield* getGitHubAccountByUserId(userId);
		return yield* Option.match(accountOption, {
			onNone: () =>
				Effect.fail(
					new GitHubNotLinkedError({ message: "GitHub account not linked" }),
				),
			onSome: Effect.succeed,
		});
	});

export const getGitHubAccountByDiscordId = (
	discordId: bigint,
): Effect.Effect<
	Option.Option<GitHubAccountWithRefresh>,
	never,
	BetterAuthAccounts
> =>
	Effect.gen(function* () {
		const userIdOption = yield* getBetterAuthUserIdByDiscordId(discordId);
		if (Option.isNone(userIdOption)) {
			return Option.none();
		}
		return yield* getGitHubAccountByUserId(userIdOption.value);
	});

const GitHubTokenRefreshResponseSchema = Schema.Struct({
	access_token: Schema.String,
	refresh_token: Schema.String,
	expires_in: Schema.Number,
	refresh_token_expires_in: Schema.Number,
	error: Schema.optional(Schema.String),
	error_description: Schema.optional(Schema.String),
}).pipe(Schema.annotations({ parseOptions: { onExcessProperty: "ignore" } }));

const isTokenExpired = (expiresAt: number | null): boolean => {
	if (expiresAt === null) return false;
	return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
};

const refreshGitHubToken = (
	account: GitHubAccountWithRefresh,
	clientId: string,
	clientSecret: string,
): Effect.Effect<
	string,
	GitHubNoTokenError | GitHubRefreshFailedError,
	BetterAuthAccounts
> =>
	Effect.gen(function* () {
		if (!account.refreshToken) {
			return yield* Effect.fail(
				new GitHubNoTokenError({ message: "No refresh token available" }),
			);
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
						refresh_token: account.refreshToken,
					}),
				}),
			catch: (error) =>
				new GitHubRefreshFailedError({
					message:
						error instanceof Error ? error.message : "Failed to refresh token",
				}),
		});

		const rawData = yield* Effect.tryPromise({
			try: () => response.json(),
			catch: () =>
				new GitHubRefreshFailedError({
					message: "Failed to parse token response",
				}),
		});

		const parseResult = Schema.decodeUnknownEither(
			GitHubTokenRefreshResponseSchema,
		)(rawData);
		if (parseResult._tag === "Left") {
			return yield* Effect.fail(
				new GitHubRefreshFailedError({
					message: `Invalid token response from GitHub: ${parseResult.left.message}`,
				}),
			);
		}

		const data = parseResult.right;

		if (data.error) {
			return yield* Effect.fail(
				new GitHubRefreshFailedError({
					message: data.error_description ?? data.error,
				}),
			);
		}

		const now = Date.now();
		const accessTokenExpiresAt = now + data.expires_in * 1000;

		const accounts = yield* BetterAuthAccounts;
		yield* accounts.updateAccount("github", account.accountId, {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			accessTokenExpiresAt,
		});

		return data.access_token;
	});

const createGitHubApiClient = (
	token: string,
): Effect.Effect<Client, never, HttpClient.HttpClient> =>
	Effect.gen(function* () {
		const httpClient = yield* HttpClient.HttpClient;
		return make(httpClient, {
			transformClient(client) {
				return Effect.succeed(
					client.pipe(
						HttpClient.mapRequest((req) =>
							HttpClientRequest.prependUrl(
								HttpClientRequest.setHeader(
									req,
									"Authorization",
									`token ${token}`,
								),
								"https://api.github.com",
							),
						),
					),
				);
			},
		});
	});

export const createGitHubClient = (
	account: GitHubAccountWithRefresh,
): Effect.Effect<
	Client,
	| GitHubCredentialsNotConfiguredError
	| GitHubNoTokenError
	| GitHubRefreshFailedError,
	BetterAuthAccounts
> =>
	Effect.gen(function* () {
		const clientId = process.env.GITHUB_CLIENT_ID;
		const clientSecret = process.env.GITHUB_CLIENT_SECRET;

		if (!clientId || !clientSecret) {
			return yield* Effect.fail(
				new GitHubCredentialsNotConfiguredError({
					message: "GitHub App credentials not configured",
				}),
			);
		}

		if (!account.accessToken) {
			return yield* Effect.fail(
				new GitHubNoTokenError({ message: "No access token available" }),
			);
		}

		if (!account.refreshToken) {
			return yield* Effect.fail(
				new GitHubNoTokenError({ message: "No refresh token available" }),
			);
		}

		let accessToken = account.accessToken;

		if (isTokenExpired(account.accessTokenExpiresAt)) {
			accessToken = yield* refreshGitHubToken(account, clientId, clientSecret);
		}

		return yield* createGitHubApiClient(accessToken).pipe(
			Effect.provide(FetchHttpClient.layer),
		);
	});

const mapGitHubApiError = (error: unknown): GitHubFetchFailedError => {
	if (error instanceof Error) {
		return new GitHubFetchFailedError({ message: error.message });
	}
	if (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		"cause" in error
	) {
		const clientError = error as { _tag: string; cause?: { message?: string } };
		return new GitHubFetchFailedError({
			message: clientError.cause?.message ?? clientError._tag,
		});
	}
	return new GitHubFetchFailedError({
		message: "Failed to fetch from GitHub API",
	});
};

const fetchInstallationReposPage = (
	client: Client,
	installationId: number,
	page: number,
): Effect.Effect<
	{ repos: Array<GitHubRepo>; hasMore: boolean },
	GitHubFetchFailedError
> =>
	Effect.gen(function* () {
		const reposData = yield* client
			.appsListInstallationReposForAuthenticatedUser(
				installationId.toString(),
				{
					per_page: 100,
					page,
				},
			)
			.pipe(Effect.mapError(mapGitHubApiError));

		const repos = reposData.repositories.map((repo) => ({
			id: repo.id,
			name: repo.name,
			fullName: repo.full_name,
			owner: repo.owner.login,
			private: repo.private,
			installationId,
		}));

		return {
			repos,
			hasMore: reposData.repositories.length === 100,
		};
	});

const fetchAllInstallationRepos = (
	client: Client,
	installationId: number,
): Effect.Effect<Array<GitHubRepo>, GitHubFetchFailedError> =>
	Effect.gen(function* () {
		const allRepos: Array<GitHubRepo> = [];
		let page = 1;
		let hasMore = true;

		while (hasMore && allRepos.length < MAX_REPOS_PER_INSTALLATION) {
			const result = yield* fetchInstallationReposPage(
				client,
				installationId,
				page,
			);
			allRepos.push(...result.repos);
			hasMore = result.hasMore;
			page++;
		}

		return allRepos.slice(0, MAX_REPOS_PER_INSTALLATION);
	});

export const fetchGitHubInstallationRepos = (
	client: Client,
): Effect.Effect<GitHubInstallationReposResult, GitHubFetchFailedError> =>
	Effect.gen(function* () {
		const installationsData = yield* client
			.appsListInstallationsForAuthenticatedUser()
			.pipe(Effect.mapError(mapGitHubApiError));

		const installations = installationsData.installations;
		const hasAllReposAccess =
			installations.length > 0 &&
			installations.every((i) => i.repository_selection === "all");

		const allRepos = yield* Effect.forEach(
			installations,
			(installation) => fetchAllInstallationRepos(client, installation.id),
			{ concurrency: 3 },
		);

		return {
			repos: Arr.flatten(allRepos),
			hasAllReposAccess,
		};
	});

const mapGitHubCreateError = (error: unknown): GitHubCreateFailedError => {
	if (error instanceof Error) {
		return new GitHubCreateFailedError({ message: error.message });
	}
	if (
		typeof error === "object" &&
		error !== null &&
		"_tag" in error &&
		"cause" in error
	) {
		const clientError = error as { _tag: string; cause?: { message?: string } };
		return new GitHubCreateFailedError({
			message: clientError.cause?.message ?? clientError._tag,
		});
	}
	return new GitHubCreateFailedError({ message: "Failed to create issue" });
};

export const createGitHubIssue = (
	client: Client,
	owner: string,
	repo: string,
	title: string,
	body: string,
): Effect.Effect<
	GitHubCreateIssueResult,
	GitHubInvalidRepoError | GitHubInvalidInputError | GitHubCreateFailedError
> =>
	Effect.gen(function* () {
		yield* validateRepoOwnerAndName(owner, repo);
		yield* validateIssueTitleAndBody(title, body);

		const result = yield* client
			.issuesCreate(owner, repo, {
				payload: {
					title,
					body,
				},
			})
			.pipe(Effect.mapError(mapGitHubCreateError));

		return {
			id: result.id,
			number: result.number,
			htmlUrl: result.html_url,
			title: result.title,
		};
	});
