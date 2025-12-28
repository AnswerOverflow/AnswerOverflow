import { Effect, Either, Option, Schema } from "effect";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import {
	ConfectMutationCtx,
	internalMutation as confectInternalMutation,
} from "../confect";
import {
	privateAction,
	privateMutation,
	privateQuery,
} from "../client/private";
import { githubIssueStatusValidator } from "../schema";
import {
	BetterAuthAccountsLive,
	createGitHubIssue,
	createGitHubClient,
	fetchGitHubInstallationRepos,
	type GitHubRepo,
	getBetterAuthUserIdByDiscordId,
	getGitHubAccountByDiscordId,
	validateIssueTitleAndBody,
	validateRepoOwnerAndName,
	serializeError,
	GitHubUserNotFoundError,
	GitHubNotLinkedError,
	GitHubRateLimitedError,
	GetAccessibleReposErrorSchema,
	CreateGitHubIssueErrorSchema,
	GitHubRepoSchema,
} from "../shared/github";

const GetAccessibleReposSuccessSchema = Schema.Struct({
	_tag: Schema.Literal("Success"),
	repos: Schema.Array(GitHubRepoSchema),
	hasAllReposAccess: Schema.Boolean,
});

const GetAccessibleReposResultSchema = Schema.Union(
	GetAccessibleReposSuccessSchema,
	GetAccessibleReposErrorSchema,
);

type GetAccessibleReposResult = Schema.Schema.Type<
	typeof GetAccessibleReposResultSchema
>;

export const getAccessibleReposByDiscordId = privateAction({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args): Promise<GetAccessibleReposResult> => {
		const fetchRepos = Effect.gen(function* () {
			const userIdOption = yield* getBetterAuthUserIdByDiscordId(
				args.discordId,
			);
			if (Option.isNone(userIdOption)) {
				return yield* Effect.fail(
					new GitHubUserNotFoundError({ message: "User not found" }),
				);
			}
			const userId = userIdOption.value;

			const rateLimitResult = yield* Effect.promise(() =>
				ctx.runMutation(internal.internal.rateLimiter.checkGitHubFetchRepos, {
					userId,
				}),
			);
			if (!rateLimitResult.ok) {
				const retryAfterSeconds = Math.ceil(
					(rateLimitResult.retryAfter ?? 0) / 1000,
				);
				return yield* Effect.fail(
					new GitHubRateLimitedError({
						message: `Rate limited. Try again in ${retryAfterSeconds} seconds.`,
						retryAfterSeconds,
					}),
				);
			}

			const accountOption = yield* getGitHubAccountByDiscordId(args.discordId);

			if (Option.isNone(accountOption)) {
				return yield* Effect.fail(
					new GitHubNotLinkedError({ message: "GitHub account not linked" }),
				);
			}

			const account = accountOption.value;
			const client = yield* createGitHubClient(account);
			const { repos, hasAllReposAccess } =
				yield* fetchGitHubInstallationRepos(client);

			return {
				_tag: "Success" as const,
				repos: [...repos],
				hasAllReposAccess,
			};
		}).pipe(Effect.provide(BetterAuthAccountsLive(ctx)));

		const result = await Effect.runPromise(Effect.either(fetchRepos));

		if (Either.isLeft(result)) {
			return serializeError(result.left);
		}

		return result.right;
	},
});

const CreateGitHubIssueSuccessSchema = Schema.Struct({
	_tag: Schema.Literal("Success"),
	issue: Schema.Struct({
		id: Schema.Number,
		number: Schema.Number,
		url: Schema.String,
		title: Schema.String,
	}),
});

const CreateGitHubIssueResultSchema = Schema.Union(
	CreateGitHubIssueSuccessSchema,
	CreateGitHubIssueErrorSchema,
);

type CreateGitHubIssueResult = Schema.Schema.Type<
	typeof CreateGitHubIssueResultSchema
>;

export const createGitHubIssueFromDiscord = privateAction({
	args: {
		discordId: v.int64(),
		repoOwner: v.string(),
		repoName: v.string(),
		title: v.string(),
		body: v.string(),
		discordServerId: v.int64(),
		discordChannelId: v.int64(),
		discordMessageId: v.int64(),
		discordThreadId: v.optional(v.int64()),
	},
	handler: async (ctx, args): Promise<CreateGitHubIssueResult> => {
		const createIssueEffect = Effect.gen(function* () {
			yield* validateRepoOwnerAndName(args.repoOwner, args.repoName);
			yield* validateIssueTitleAndBody(args.title, args.body);

			const userIdOption = yield* getBetterAuthUserIdByDiscordId(
				args.discordId,
			);
			if (Option.isNone(userIdOption)) {
				return yield* Effect.fail(
					new GitHubUserNotFoundError({ message: "User not found" }),
				);
			}
			const userId = userIdOption.value;

			const rateLimitResult = yield* Effect.promise(() =>
				ctx.runMutation(internal.internal.rateLimiter.checkGitHubCreateIssue, {
					userId,
				}),
			);
			if (!rateLimitResult.ok) {
				const retryAfterSeconds = Math.ceil(
					(rateLimitResult.retryAfter ?? 0) / 1000,
				);
				return yield* Effect.fail(
					new GitHubRateLimitedError({
						message: `Rate limited. Try again in ${retryAfterSeconds} seconds.`,
						retryAfterSeconds,
					}),
				);
			}

			const accountOption = yield* getGitHubAccountByDiscordId(args.discordId);

			if (Option.isNone(accountOption)) {
				return yield* Effect.fail(
					new GitHubNotLinkedError({ message: "GitHub account not linked" }),
				);
			}

			const account = accountOption.value;
			const client = yield* createGitHubClient(account);

			const issue = yield* createGitHubIssue(
				client,
				args.repoOwner,
				args.repoName,
				args.title,
				args.body,
			);

			yield* Effect.promise(() =>
				ctx.runMutation(
					internal.private.github.createGitHubIssueRecordInternal,
					{
						issueId: issue.id,
						issueNumber: issue.number,
						repoOwner: args.repoOwner,
						repoName: args.repoName,
						issueUrl: issue.htmlUrl,
						issueTitle: issue.title,
						discordServerId: args.discordServerId,
						discordChannelId: args.discordChannelId,
						discordMessageId: args.discordMessageId,
						discordThreadId: args.discordThreadId,
						createdByUserId: userId,
					},
				),
			);

			return {
				_tag: "Success" as const,
				issue: {
					id: issue.id,
					number: issue.number,
					url: issue.htmlUrl,
					title: issue.title,
				},
			};
		}).pipe(Effect.provide(BetterAuthAccountsLive(ctx)));

		const result = await Effect.runPromise(Effect.either(createIssueEffect));

		if (Either.isLeft(result)) {
			return serializeError(result.left);
		}

		return result.right;
	},
});

const CreateGitHubIssueArgs = Schema.Struct({
	issueId: Schema.Number,
	issueNumber: Schema.Number,
	repoOwner: Schema.String,
	repoName: Schema.String,
	issueUrl: Schema.String,
	issueTitle: Schema.String,
	discordServerId: Schema.BigIntFromSelf,
	discordChannelId: Schema.BigIntFromSelf,
	discordMessageId: Schema.BigIntFromSelf,
	discordThreadId: Schema.optional(Schema.BigIntFromSelf),
	createdByUserId: Schema.String,
});

export const createGitHubIssueRecordInternal = confectInternalMutation({
	args: CreateGitHubIssueArgs,
	returns: Schema.String,
	handler: (args) =>
		Effect.gen(function* () {
			const { db } = yield* ConfectMutationCtx;
			const id = yield* db.insert("githubIssues", {
				issueId: args.issueId,
				issueNumber: args.issueNumber,
				repoOwner: args.repoOwner,
				repoName: args.repoName,
				issueUrl: args.issueUrl,
				issueTitle: args.issueTitle,
				discordServerId: args.discordServerId,
				discordChannelId: args.discordChannelId,
				discordMessageId: args.discordMessageId,
				discordThreadId: args.discordThreadId,
				createdByUserId: args.createdByUserId,
				status: "open" as const,
			});
			return id;
		}),
});

export const getGitHubIssueByRepoAndNumber = privateQuery({
	args: {
		repoOwner: v.string(),
		repoName: v.string(),
		issueNumber: v.number(),
	},
	handler: async (ctx, args) => {
		return await ctx.db
			.query("githubIssues")
			.withIndex("by_repoOwner_and_repoName_and_issueNumber", (q) =>
				q
					.eq("repoOwner", args.repoOwner)
					.eq("repoName", args.repoName)
					.eq("issueNumber", args.issueNumber),
			)
			.first();
	},
});

export const updateGitHubIssueStatus = privateMutation({
	args: {
		repoOwner: v.string(),
		repoName: v.string(),
		issueNumber: v.number(),
		status: githubIssueStatusValidator,
	},
	handler: async (ctx, args) => {
		const issue = await ctx.db
			.query("githubIssues")
			.withIndex("by_repoOwner_and_repoName_and_issueNumber", (q) =>
				q
					.eq("repoOwner", args.repoOwner)
					.eq("repoName", args.repoName)
					.eq("issueNumber", args.issueNumber),
			)
			.first();

		if (!issue) {
			return null;
		}

		await ctx.db.patch(issue._id, { status: args.status });
		return issue;
	},
});

export { GetAccessibleReposResultSchema, CreateGitHubIssueResultSchema };
export type { GetAccessibleReposResult, CreateGitHubIssueResult };
