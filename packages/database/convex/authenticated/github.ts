import { v } from "convex/values";
import { authenticatedAction, authenticatedQuery } from "../client";
import { authComponent } from "../shared/betterAuth";
import {
	createOctokitClient,
	fetchGitHubInstallationRepos,
	GitHubErrorCodes,
	getFeaturedRepos,
	getGitHubAccountByUserId,
	getOrgPopularRepos,
	searchGitHubRepositories,
} from "../shared/github";

export const getGitHubAccount = authenticatedQuery({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return null;
		}

		const account = await getGitHubAccountByUserId(ctx, user._id);
		if (!account) {
			return null;
		}

		return {
			accountId: account.accountId,
			isConnected: true,
		};
	},
});

export const getAccessibleRepos = authenticatedAction({
	args: {},
	handler: async (ctx) => {
		const user = await authComponent.getAuthUser(ctx);
		if (!user) {
			return {
				success: false as const,
				error: "Not authenticated",
				code: "NOT_AUTHENTICATED" as const,
			};
		}

		const account = await getGitHubAccountByUserId(ctx, user._id);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: GitHubErrorCodes.NOT_LINKED,
			};
		}

		const octokitResult = await createOctokitClient(ctx, account);
		if (!octokitResult.success) {
			return {
				success: false as const,
				error: octokitResult.error,
				code: octokitResult.code,
			};
		}

		try {
			const { repos, hasAllReposAccess } = await fetchGitHubInstallationRepos(
				octokitResult.octokit,
			);

			return {
				success: true as const,
				repos,
				hasAllReposAccess,
			};
		} catch (error) {
			return {
				success: false as const,
				error: error instanceof Error ? error.message : "Failed to fetch repos",
				code: GitHubErrorCodes.FETCH_FAILED,
			};
		}
	},
});

export const searchRepos = authenticatedAction({
	args: {
		query: v.string(),
		org: v.optional(v.string()),
	},
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByUserId(ctx, args.userId);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: GitHubErrorCodes.NOT_LINKED,
			};
		}

		const octokitResult = await createOctokitClient(ctx, account);
		if (!octokitResult.success) {
			return {
				success: false as const,
				error: octokitResult.error,
				code: octokitResult.code,
			};
		}

		try {
			const repos = await searchGitHubRepositories(
				octokitResult.octokit,
				args.query,
				args.org,
			);

			return {
				success: true as const,
				repos,
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error ? error.message : "Failed to search repos",
				code: GitHubErrorCodes.FETCH_FAILED,
			};
		}
	},
});

export const getOrgRepos = authenticatedAction({
	args: {
		org: v.string(),
	},
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByUserId(ctx, args.userId);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: GitHubErrorCodes.NOT_LINKED,
			};
		}

		const octokitResult = await createOctokitClient(ctx, account);
		if (!octokitResult.success) {
			return {
				success: false as const,
				error: octokitResult.error,
				code: octokitResult.code,
			};
		}

		try {
			const repos = await getOrgPopularRepos(octokitResult.octokit, args.org);

			return {
				success: true as const,
				repos,
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error ? error.message : "Failed to get org repos",
				code: GitHubErrorCodes.FETCH_FAILED,
			};
		}
	},
});

export const getFeatured = authenticatedAction({
	args: {},
	handler: async (ctx, args) => {
		const account = await getGitHubAccountByUserId(ctx, args.userId);

		if (!account) {
			return {
				success: false as const,
				error: "GitHub account not linked",
				code: GitHubErrorCodes.NOT_LINKED,
			};
		}

		const octokitResult = await createOctokitClient(ctx, account);
		if (!octokitResult.success) {
			return {
				success: false as const,
				error: octokitResult.error,
				code: octokitResult.code,
			};
		}

		try {
			const repos = await getFeaturedRepos(octokitResult.octokit);

			return {
				success: true as const,
				repos,
			};
		} catch (error) {
			return {
				success: false as const,
				error:
					error instanceof Error
						? error.message
						: "Failed to get featured repos",
				code: GitHubErrorCodes.FETCH_FAILED,
			};
		}
	},
});
