import { Effect, Schema } from "effect";
import { ConfectMutationCtx, internalMutation } from "../confect";
import { rateLimiter } from "../shared/rateLimiter";

const RateLimitResult = Schema.Struct({
	ok: Schema.Boolean,
	retryAfter: Schema.optional(Schema.Number),
});

export const checkGitHubCreateIssue = internalMutation({
	args: Schema.Struct({
		userId: Schema.String,
	}),
	returns: RateLimitResult,
	handler: ({ userId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;
			const result = yield* Effect.promise(() =>
				rateLimiter.limit(ctx, "githubCreateIssue", {
					key: userId,
				}),
			);
			return {
				ok: result.ok,
				retryAfter: result.retryAfter ?? undefined,
			};
		}),
});

export const checkGitHubFetchRepos = internalMutation({
	args: Schema.Struct({
		userId: Schema.String,
	}),
	returns: RateLimitResult,
	handler: ({ userId }) =>
		Effect.gen(function* () {
			const { ctx } = yield* ConfectMutationCtx;
			const result = yield* Effect.promise(() =>
				rateLimiter.limit(ctx, "githubFetchRepos", {
					key: userId,
				}),
			);
			return {
				ok: result.ok,
				retryAfter: result.retryAfter ?? undefined,
			};
		}),
});
