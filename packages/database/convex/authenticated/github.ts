import { Effect, Option, Schema } from "effect";
import {
	authenticatedAction,
	authenticatedQuery,
	AuthenticatedUser,
} from "../client/confectAuthenticated";
import {
	createGitHubClient,
	fetchGitHubInstallationRepos,
	GetAccessibleReposErrorSchema,
	GitHubRepoSchema,
	getGitHubAccountByUserId,
	getGitHubAccountByUserIdOrFail,
} from "../shared/github";

const GitHubAccountResult = Schema.NullOr(
	Schema.Struct({
		accountId: Schema.String,
		isConnected: Schema.Literal(true),
	}),
);

export const getGitHubAccount = authenticatedQuery({
	args: Schema.Struct({}),
	success: GitHubAccountResult,
	error: Schema.Never,
	handler: () =>
		Effect.gen(function* () {
			const user = yield* AuthenticatedUser;

			const accountOption = yield* getGitHubAccountByUserId(user._id);
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

export const getAccessibleRepos = authenticatedAction({
	args: Schema.Struct({}),
	success: GetAccessibleReposDataSchema,
	error: GetAccessibleReposErrorSchema,
	handler: () =>
		Effect.gen(function* () {
			const user = yield* AuthenticatedUser;

			const account = yield* getGitHubAccountByUserIdOrFail(user._id);
			const client = yield* createGitHubClient(account);
			const { repos, hasAllReposAccess } =
				yield* fetchGitHubInstallationRepos(client);

			return { repos, hasAllReposAccess };
		}),
});
