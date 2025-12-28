import type {
	GenericActionCtx,
	GenericMutationCtx,
	GenericQueryCtx,
} from "convex/server";
import { Data, Effect, Option, Schema } from "effect";
import { Octokit } from "octokit";
import { components } from "../../_generated/api";
import type { DataModel } from "../../_generated/dataModel";

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

type ConvexCtx =
	| GenericQueryCtx<DataModel>
	| GenericMutationCtx<DataModel>
	| GenericActionCtx<DataModel>;
type ActionCtx = GenericActionCtx<DataModel>;

const RawGitHubAccountSchema = Schema.Struct({
	_id: Schema.String,
	accountId: Schema.String,
	providerId: Schema.Literal("github"),
	userId: Schema.String,
	accessToken: Schema.optionalWith(Schema.NullishOr(Schema.String), {
		exact: true,
	}),
	refreshToken: Schema.optionalWith(Schema.NullishOr(Schema.String), {
		exact: true,
	}),
	accessTokenExpiresAt: Schema.optionalWith(Schema.NullishOr(Schema.Number), {
		exact: true,
	}),
	scope: Schema.optionalWith(Schema.NullishOr(Schema.String), { exact: true }),
});

const AccountWithUserIdSchema = Schema.Struct({
	userId: Schema.String,
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
	ctx: ConvexCtx,
	discordId: bigint,
): Effect.Effect<Option.Option<string>> =>
	Effect.gen(function* () {
		const discordAccountResult = yield* Effect.promise(() =>
			ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: "account",
				where: [
					{ field: "accountId", operator: "eq", value: discordId.toString() },
					{ field: "providerId", operator: "eq", value: "discord" },
				],
			}),
		);

		const decoded = Schema.decodeUnknownOption(AccountWithUserIdSchema)(
			discordAccountResult,
		);
		return Option.map(decoded, (account) => account.userId);
	});

export const getGitHubAccountByUserId = (
	ctx: ConvexCtx,
	userId: string,
): Effect.Effect<Option.Option<GitHubAccountWithRefresh>> =>
	Effect.gen(function* () {
		const accountResult = yield* Effect.promise(() =>
			ctx.runQuery(components.betterAuth.adapter.findOne, {
				model: "account",
				where: [
					{ field: "userId", operator: "eq", value: userId },
					{ field: "providerId", operator: "eq", value: "github" },
				],
			}),
		);

		const decoded = Schema.decodeUnknownOption(RawGitHubAccountSchema)(
			accountResult,
		);
		return Option.map(decoded, (raw) => ({
			_id: raw._id,
			accountId: raw.accountId,
			userId: raw.userId,
			accessToken: raw.accessToken ?? null,
			refreshToken: raw.refreshToken ?? null,
			accessTokenExpiresAt: raw.accessTokenExpiresAt ?? null,
			scope: raw.scope ?? null,
		}));
	});

export const getGitHubAccountByDiscordId = (
	ctx: ConvexCtx,
	discordId: bigint,
): Effect.Effect<Option.Option<GitHubAccountWithRefresh>> =>
	Effect.gen(function* () {
		const userIdOption = yield* getBetterAuthUserIdByDiscordId(ctx, discordId);
		if (Option.isNone(userIdOption)) {
			return Option.none();
		}
		return yield* getGitHubAccountByUserId(ctx, userIdOption.value);
	});

const RefreshedTokensSchema = Schema.Struct({
	accessToken: Schema.String,
	refreshToken: Schema.String,
	accessTokenExpiresAt: Schema.Number,
});

type RefreshedTokens = Schema.Schema.Type<typeof RefreshedTokensSchema>;

const updateGitHubAccountTokens = (
	ctx: ActionCtx,
	githubAccountId: string,
	tokens: RefreshedTokens,
): Effect.Effect<void> =>
	Effect.promise(() =>
		ctx.runMutation(components.betterAuth.adapter.updateOne, {
			input: {
				model: "account",
				where: [
					{ field: "accountId", operator: "eq", value: githubAccountId },
					{ field: "providerId", operator: "eq", value: "github" },
				],
				update: {
					accessToken: tokens.accessToken,
					refreshToken: tokens.refreshToken,
					accessTokenExpiresAt: tokens.accessTokenExpiresAt,
					updatedAt: Date.now(),
				},
			},
		}),
	);

const GitHubTokenRefreshResponseSchema = Schema.Struct({
	access_token: Schema.String,
	refresh_token: Schema.String,
	expires_in: Schema.Number,
	refresh_token_expires_in: Schema.Number,
	error: Schema.optional(Schema.String),
	error_description: Schema.optional(Schema.String),
});

const isTokenExpired = (expiresAt: number | null): boolean => {
	if (expiresAt === null) return false;
	return Date.now() >= expiresAt - TOKEN_EXPIRY_BUFFER_MS;
};

const refreshGitHubToken = (
	ctx: ActionCtx,
	account: GitHubAccountWithRefresh,
	clientId: string,
	clientSecret: string,
): Effect.Effect<string, GitHubNoTokenError | GitHubRefreshFailedError> =>
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

		yield* updateGitHubAccountTokens(ctx, account.accountId, {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
			accessTokenExpiresAt,
		});

		return data.access_token;
	});

export const createOctokitClient = (
	ctx: ActionCtx,
	account: GitHubAccountWithRefresh,
): Effect.Effect<
	Octokit,
	| GitHubCredentialsNotConfiguredError
	| GitHubNoTokenError
	| GitHubRefreshFailedError
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
			accessToken = yield* refreshGitHubToken(
				ctx,
				account,
				clientId,
				clientSecret,
			);
		}

		return new Octokit({ auth: accessToken });
	});

export const fetchGitHubInstallationRepos = (
	octokit: Octokit,
): Effect.Effect<GitHubInstallationReposResult, GitHubFetchFailedError> =>
	Effect.gen(function* () {
		const installationsData = yield* Effect.tryPromise({
			try: () => octokit.rest.apps.listInstallationsForAuthenticatedUser(),
			catch: (error) =>
				new GitHubFetchFailedError({
					message:
						error instanceof Error
							? error.message
							: "Failed to fetch installations",
				}),
		});

		const repos: Array<GitHubRepo> = [];
		let hasAllReposAccess = installationsData.data.installations.length > 0;

		for (const installation of installationsData.data.installations) {
			if (installation.repository_selection !== "all") {
				hasAllReposAccess = false;
			}

			const allRepos: Array<GitHubRepo> = [];
			let page = 1;

			while (allRepos.length < MAX_REPOS_PER_INSTALLATION) {
				const reposData = yield* Effect.tryPromise({
					try: () =>
						octokit.rest.apps.listInstallationReposForAuthenticatedUser({
							installation_id: installation.id,
							per_page: 100,
							page,
						}),
					catch: (error) =>
						new GitHubFetchFailedError({
							message:
								error instanceof Error
									? error.message
									: "Failed to fetch repos",
						}),
				});

				for (const repo of reposData.data.repositories) {
					allRepos.push({
						id: repo.id,
						name: repo.name,
						fullName: repo.full_name,
						owner: repo.owner.login,
						private: repo.private,
						installationId: installation.id,
					});
				}

				if (reposData.data.repositories.length < 100) {
					break;
				}
				page++;
			}

			repos.push(...allRepos);
		}

		return { repos, hasAllReposAccess };
	});

export const createGitHubIssue = (
	octokit: Octokit,
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

		const result = yield* Effect.tryPromise({
			try: () =>
				octokit.rest.issues.create({
					owner,
					repo,
					title,
					body,
				}),
			catch: (error) =>
				new GitHubCreateFailedError({
					message:
						error instanceof Error ? error.message : "Failed to create issue",
				}),
		});

		return {
			id: result.data.id,
			number: result.data.number,
			htmlUrl: result.data.html_url,
			title: result.data.title,
		};
	});
