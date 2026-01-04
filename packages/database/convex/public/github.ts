import { ActionCache } from "@convex-dev/action-cache";
import { v } from "convex/values";
import { Octokit } from "octokit";
import { components, internal } from "../_generated/api";
import type { DiscordInviteInfo } from "../private/github";
import { publicAction } from "./custom_functions";

type PublicGitHubSearchRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: false;
	description: string | null;
	stargazersCount: number;
	language: string | null;
};

const getDiscordInviteInfoCache = () =>
	new ActionCache(components.actionCache, {
		action: internal.private.github.fetchDiscordInviteInfoInternal,
		name: "discordInviteInfo",
		ttl: 24 * 60 * 60 * 1000,
	});

export const getDiscordInviteInfo = publicAction({
	args: {
		owner: v.string(),
		repo: v.string(),
	},
	returns: v.object({
		hasDiscordInvite: v.boolean(),
		inviteCodes: v.array(v.string()),
		isOnAnswerOverflow: v.boolean(),
		serverName: v.optional(v.string()),
	}),
	handler: async (ctx, args): Promise<DiscordInviteInfo> => {
		return await getDiscordInviteInfoCache().fetch(ctx, {
			owner: args.owner,
			repo: args.repo,
		});
	},
});

const githubSearchRepoValidator = v.object({
	id: v.number(),
	name: v.string(),
	fullName: v.string(),
	owner: v.string(),
	private: v.literal(false),
	description: v.union(v.string(), v.null()),
	stargazersCount: v.number(),
	language: v.union(v.string(), v.null()),
});

function createPublicOctokit(): Octokit {
	return new Octokit();
}

async function searchPublicRepositories(
	query: string,
	org?: string,
): Promise<Array<PublicGitHubSearchRepo>> {
	const octokit = createPublicOctokit();
	const searchQuery = org
		? `${query} org:${org} is:public`
		: `${query} is:public`;

	const { data } = await octokit.rest.search.repos({
		q: searchQuery,
		per_page: 20,
		sort: "stars",
		order: "desc",
	});

	return data.items
		.filter((repo) => !repo.private)
		.map((repo) => ({
			id: repo.id,
			name: repo.name,
			fullName: repo.full_name,
			owner: repo.owner?.login ?? "",
			private: false as const,
			description: repo.description,
			stargazersCount: repo.stargazers_count ?? 0,
			language: repo.language,
		}));
}

async function getPublicOrgRepos(
	org: string,
): Promise<Array<PublicGitHubSearchRepo>> {
	const octokit = createPublicOctokit();

	const { data } = await octokit.rest.search.repos({
		q: `org:${org} is:public`,
		per_page: 20,
		sort: "stars",
		order: "desc",
	});

	return data.items
		.filter((repo) => !repo.private)
		.map((repo) => ({
			id: repo.id,
			name: repo.name,
			fullName: repo.full_name,
			owner: repo.owner?.login ?? "",
			private: false as const,
			description: repo.description,
			stargazersCount: repo.stargazers_count ?? 0,
			language: repo.language,
		}));
}

async function getPublicFeaturedRepos(): Promise<
	Array<PublicGitHubSearchRepo>
> {
	const octokit = createPublicOctokit();

	const { data } = await octokit.rest.search.repos({
		q: "stars:>50000 is:public",
		per_page: 20,
		sort: "stars",
		order: "desc",
	});

	return data.items
		.filter((repo) => !repo.private)
		.map((repo) => ({
			id: repo.id,
			name: repo.name,
			fullName: repo.full_name,
			owner: repo.owner?.login ?? "",
			private: false as const,
			description: repo.description,
			stargazersCount: repo.stargazers_count ?? 0,
			language: repo.language,
		}));
}

export const searchRepos = publicAction({
	args: {
		query: v.string(),
		org: v.optional(v.string()),
	},
	returns: v.object({
		success: v.literal(true),
		repos: v.array(githubSearchRepoValidator),
	}),
	handler: async (_ctx, args) => {
		const repos = await searchPublicRepositories(args.query, args.org);
		return {
			success: true as const,
			repos,
		};
	},
});

export const getOrgRepos = publicAction({
	args: {
		org: v.string(),
	},
	returns: v.object({
		success: v.literal(true),
		repos: v.array(githubSearchRepoValidator),
	}),
	handler: async (_ctx, args) => {
		const repos = await getPublicOrgRepos(args.org);
		return {
			success: true as const,
			repos,
		};
	},
});

export const getFeatured = publicAction({
	args: {},
	returns: v.object({
		success: v.literal(true),
		repos: v.array(githubSearchRepoValidator),
	}),
	handler: async () => {
		const repos = await getPublicFeaturedRepos();
		return {
			success: true as const,
			repos,
		};
	},
});
