// TODO: Migrate GitHub API implementation to use Octokit instead of manual fetch calls
// This file currently contains manual GitHub API calls that should be replaced with Octokit
// for better type safety, error handling, and maintainability. Consider either:
// 1. Using Octokit's built-in methods for all GitHub API interactions
// 2. Code-generating from GitHub's OpenAPI spec (similar to Discord API)
// Octokit is probably the better choice for consistency and community support.

export type {
	CreateOctokitClientResult,
	GitHubAccountToken,
	GitHubAccountWithRefresh,
	GitHubCreateIssueResult,
	GitHubErrorCode,
	GitHubRepo,
} from "./auth/github";
export {
	createGitHubIssue,
	createOctokitClient,
	fetchGitHubInstallationRepos,
	GitHubErrorCodes,
	getBetterAuthUserIdByDiscordId,
	getFeaturedRepos,
	getGitHubAccountByDiscordId,
	getGitHubAccountByUserId,
	getOrgPopularRepos,
	searchGitHubRepositories,
	validateIssueTitleAndBody,
	validateRepoOwnerAndName,
} from "./auth/github";
