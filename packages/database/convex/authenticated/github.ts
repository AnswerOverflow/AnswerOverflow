import { Effect, Option, Schema } from "effect";
import { action, ConfectActionCtx, ConfectQueryCtx, query } from "../confect";
import { authComponent } from "../shared/betterAuth";
import {
	createOctokitClient,
	fetchGitHubInstallationRepos,
	GetAccessibleReposErrorSchema,
	GitHubNotLinkedError,
	GitHubRepoSchema,
	getGitHubAccountByUserId,
	NotAuthenticatedError,
} from "../shared/github";

const GitHubAccountResult = Schema.NullOr(
	Schema.Struct({
		accountId: Schema.String,
		isConnected: Schema.Literal(true),
	}),
);

export const getGitHubAccount = query({
	args: Schema.Struct({}),
	returns: GitHubAccountResult,
	handler: () =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectQueryCtx;

			const user = yield* Effect.promise(() => authComponent.getAuthUser(ctx));
			if (!user) {
				return null;
			}

			const accountOption = yield* getGitHubAccountByUserId(ctx, user._id);
			if (Option.isNone(accountOption)) {
				return null;
			}

			return {
				accountId: accountOption.value.accountId,
				isConnected: true as const,
			};
		}),
});

const GetAccessibleReposDataSchema = Schema.Struct({
	repos: Schema.Array(GitHubRepoSchema),
	hasAllReposAccess: Schema.Boolean,
});

export const getAccessibleRepos = action({
	args: Schema.Struct({}),
	success: GetAccessibleReposDataSchema,
	error: GetAccessibleReposErrorSchema,
	handler: () =>
		Effect.gen(function* () {
			const actionCtx = yield* ConfectActionCtx;
			const { ctx } = actionCtx;

			const user = yield* Effect.promise(() => authComponent.getAuthUser(ctx));
			if (!user) {
				return yield* Effect.fail(
					new NotAuthenticatedError({ message: "Not authenticated" }),
				);
			}

			const accountOption = yield* getGitHubAccountByUserId(ctx, user._id);

			if (Option.isNone(accountOption)) {
				return yield* Effect.fail(
					new GitHubNotLinkedError({ message: "GitHub account not linked" }),
				);
			}

			const account = accountOption.value;
			const octokit = yield* createOctokitClient(ctx, account);
			const { repos, hasAllReposAccess } =
				yield* fetchGitHubInstallationRepos(octokit);

			return { repos, hasAllReposAccess };
		}),
});
