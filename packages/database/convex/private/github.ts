import { v } from "convex/values";
import { internal } from "../_generated/api";
import { internalMutation } from "../client";
import {
	privateAction,
	privateMutation,
	privateQuery,
} from "../client/private";
import { githubIssueStatusValidator } from "../schema";
import {
	createGitHubIssue,
	fetchGitHubInstallationRepos,
	getBetterAuthUserIdByDiscordId,
	getGitHubAccountByDiscordId,
	isGitHubTokenExpired,
	refreshGitHubToken,
	updateGitHubAccountTokens,
} from "../shared/github";

export const getAccessibleReposByDiscordId = privateAction({
	args: {
		discordId: v.int64(),
	},
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByDiscordId(ctx, args.discordId);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: "NOT_LINKED" as const,
			};
		}

		if (!account.accessToken) {
			return {
				success: false as const,
				error: "No access token available",
				code: "NO_TOKEN" as const,
			};
		}

		let accessToken = account.accessToken;

		if (isGitHubTokenExpired(account.accessTokenExpiresAt)) {
			if (!account.refreshToken) {
				return {
					success: false as const,
					error: "Token expired and no refresh token available",
					code: "REFRESH_REQUIRED" as const,
				};
			}

			try {
				const newTokens = await refreshGitHubToken(account.refreshToken);
				await updateGitHubAccountTokens(ctx, account.accountId, newTokens);
				accessToken = newTokens.accessToken;
			} catch (error) {
				return {
					success: false as const,
					error:
						error instanceof Error ? error.message : "Failed to refresh token",
					code: "REFRESH_FAILED" as const,
				};
			}
		}

		try {
			const { repos, hasAllReposAccess } =
				await fetchGitHubInstallationRepos(accessToken);

			return {
				success: true as const,
				repos,
				hasAllReposAccess,
			};
		} catch (error) {
			return {
				success: false as const,
				error: error instanceof Error ? error.message : "Failed to fetch repos",
				code: "FETCH_FAILED" as const,
			};
		}
	},
});

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
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByDiscordId(ctx, args.discordId);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: "NOT_LINKED" as const,
			};
		}

		if (!account.accessToken) {
			return {
				success: false as const,
				error: "No access token available",
				code: "NO_TOKEN" as const,
			};
		}

		let accessToken = account.accessToken;

		if (isGitHubTokenExpired(account.accessTokenExpiresAt)) {
			if (!account.refreshToken) {
				return {
					success: false as const,
					error: "Token expired and no refresh token available",
					code: "REFRESH_REQUIRED" as const,
				};
			}

			try {
				const newTokens = await refreshGitHubToken(account.refreshToken);
				await updateGitHubAccountTokens(ctx, account.accountId, newTokens);
				accessToken = newTokens.accessToken;
			} catch (error) {
				return {
					success: false as const,
					error:
						error instanceof Error ? error.message : "Failed to refresh token",
					code: "REFRESH_FAILED" as const,
				};
			}
		}

		try {
			const issue = await createGitHubIssue(
				accessToken,
				args.repoOwner,
				args.repoName,
				args.title,
				args.body,
			);

			const userId = await getBetterAuthUserIdByDiscordId(ctx, args.discordId);
			if (!userId) {
				return {
					success: false as const,
					error: "User not found",
					code: "USER_NOT_FOUND" as const,
				};
			}

			await ctx.runMutation(
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
			);

			return {
				success: true as const,
				issue: {
					id: issue.id,
					number: issue.number,
					url: issue.htmlUrl,
					title: issue.title,
				},
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error ? error.message : "Failed to create issue",
				code: "CREATE_FAILED" as const,
			};
		}
	},
});

export const createGitHubIssueRecordInternal = internalMutation({
	args: {
		issueId: v.number(),
		issueNumber: v.number(),
		repoOwner: v.string(),
		repoName: v.string(),
		issueUrl: v.string(),
		issueTitle: v.string(),
		discordServerId: v.int64(),
		discordChannelId: v.int64(),
		discordMessageId: v.int64(),
		discordThreadId: v.optional(v.int64()),
		createdByUserId: v.string(),
	},
	handler: async (ctx, args) => {
		return await ctx.db.insert("githubIssues", {
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
			status: "open",
		});
	},
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
