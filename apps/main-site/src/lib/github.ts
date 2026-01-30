import { cacheLife, cacheTag } from "next/cache";

export type GitHubSearchRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: false;
	description: string | null;
	stargazersCount: number;
	language: string | null;
};

export async function getFeaturedRepos(): Promise<Array<GitHubSearchRepo>> {
	"use cache";
	cacheLife("days");
	cacheTag("featured-repos");

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

export async function getGitHubStars(): Promise<number | null> {
	"use cache";
	cacheLife("hours");
	cacheTag("github-stars");

	const response = await fetch(
		"https://api.github.com/repos/AnswerOverflow/AnswerOverflow",
		{
			headers: {
				Accept: "application/vnd.github+json",
				"X-GitHub-Api-Version": "2022-11-28",
			},
		},
	);

	if (!response.ok) {
		console.error("Failed to fetch GitHub stars:", response.statusText);
		return null;
	}

	const data = (await response.json()) as { stargazers_count?: number };
	return data.stargazers_count ?? null;
}
