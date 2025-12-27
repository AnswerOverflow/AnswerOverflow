import { authenticatedAction, authenticatedQuery } from "../client";
import { authComponent } from "../shared/betterAuth";
import {
	fetchGitHubInstallationRepos,
	getGitHubAccountByUserId,
	isGitHubTokenExpired,
	refreshGitHubToken,
	updateGitHubAccountTokens,
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
