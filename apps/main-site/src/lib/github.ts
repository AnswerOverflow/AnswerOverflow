import { unstable_cache } from "next/cache";

export type GitHubSearchRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: boolean;
	description: string | null;
	stargazersCount: number;
	language: string | null;
};

async function fetchFeaturedReposInternal(): Promise<Array<GitHubSearchRepo>> {
	const response = await fetch(
		"https://api.github.com/search/repositories?q=stars:>50000&per_page=20&sort=stars&order=desc",
		{
			headers: {
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		console.error("Failed to fetch featured repos:", response.statusText);
		return [];
	}

	const data = (await response.json()) as {
		items: Array<{
			id: number;
			name: string;
			full_name: string;
			owner: { login: string } | null;
			private: boolean;
			description: string | null;
			stargazers_count: number;
			language: string | null;
		}>;
	};

	return data.items.map((repo) => ({
		id: repo.id,
		name: repo.name,
		fullName: repo.full_name,
		owner: repo.owner?.login ?? "",
		private: repo.private ?? false,
		description: repo.description,
		stargazersCount: repo.stargazers_count ?? 0,
		language: repo.language,
	}));
}

export const getFeaturedRepos = unstable_cache(
	fetchFeaturedReposInternal,
	["featured-repos"],
	{
		revalidate: 60 * 60 * 24,
	},
);
