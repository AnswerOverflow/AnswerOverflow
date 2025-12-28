import { Effect, Option, Schema } from "effect";
import { ConfectQueryCtx, query } from "../confect";
import {
	authenticatedAction,
	AuthenticatedUser,
	ConfectActionCtx,
} from "../client/confectAuthenticated";
import {
	createGitHubClient,
	fetchGitHubInstallationRepos,
	GetAccessibleReposErrorSchema,
	GitHubRepoSchema,
	getGitHubAccountByUserId,
	getGitHubAccountByUserIdOrFail,
} from "../shared/github";
import { authComponent } from "../shared/betterAuth";

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

export const getAccessibleRepos = authenticatedAction({
	args: Schema.Struct({}),
	success: GetAccessibleReposDataSchema,
	error: GetAccessibleReposErrorSchema,
	handler: () =>
		Effect.gen(function* () {
			const actionCtx = yield* ConfectActionCtx;
			const user = yield* AuthenticatedUser;

			const account = yield* getGitHubAccountByUserIdOrFail(
				actionCtx.ctx,
				user._id,
			);
			const client = yield* createGitHubClient(actionCtx.ctx, account);
			const { repos, hasAllReposAccess } =
				yield* fetchGitHubInstallationRepos(client);

			return { repos, hasAllReposAccess };
		}),
});
