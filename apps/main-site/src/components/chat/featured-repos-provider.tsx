"use client";

import { createContext, useContext } from "react";
import type { GitHubSearchRepo } from "@/lib/github";

const FeaturedReposContext = createContext<Array<GitHubSearchRepo>>([]);

export function useFeaturedRepos() {
	return useContext(FeaturedReposContext);
}

export function FeaturedReposProvider({
	children,
	repos,
}: {
	children: React.ReactNode;
	repos: Array<GitHubSearchRepo>;
}) {
	return (
		<FeaturedReposContext.Provider value={repos}>
			{children}
		</FeaturedReposContext.Provider>
	);
}
