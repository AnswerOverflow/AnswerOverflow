"use client";

import { api } from "@packages/database/convex/_generated/api";
import { PromptInputButton } from "@packages/ui/components/ai-elements/prompt-input";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@packages/ui/components/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@packages/ui/components/popover";
import { useQuery } from "@tanstack/react-query";
import { useAction } from "convex/react";
import { CheckIcon, GitFork, Loader2, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { useDebounce } from "use-debounce";
import type { GitHubRepo } from "./chat-interface";
import { useFeaturedRepos } from "./featured-repos-provider";

type GitHubRepoSelectorProps = {
	selectedRepo: GitHubRepo | null;
	onSelectRepo: (repo: GitHubRepo | null) => void;
};

type GitHubSearchRepo = {
	id: number;
	name: string;
	fullName: string;
	owner: string;
	private: boolean;
	description: string | null;
	stargazersCount: number;
	language: string | null;
};

export function GitHubRepoSelector({
	selectedRepo,
	onSelectRepo,
}: GitHubRepoSelectorProps) {
	const initialFeaturedRepos = useFeaturedRepos();
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [debouncedSearch] = useDebounce(search, 300);

	const searchReposAction = useAction(api.authenticated.github.searchRepos);
	const getOrgReposAction = useAction(api.authenticated.github.getOrgRepos);

	const getFeaturedAction = useAction(api.authenticated.github.getFeatured);

	const orgReposQuery = useQuery({
		queryKey: ["github-org-repos", selectedRepo?.owner],
		queryFn: async () => {
			if (!selectedRepo?.owner) return [];
			const result = await getOrgReposAction({ org: selectedRepo.owner });
			if (result.success) {
				return result.repos;
			}
			return [];
		},
		enabled: open && !!selectedRepo?.owner,
	});

	const featuredReposQuery = useQuery({
		queryKey: ["github-featured-repos"],
		queryFn: async () => {
			const result = await getFeaturedAction({});
			if (result.success) {
				return result.repos;
			}
			return [];
		},
		initialData:
			initialFeaturedRepos.length > 0 ? initialFeaturedRepos : undefined,
		enabled: open && !selectedRepo?.owner && initialFeaturedRepos.length === 0,
		staleTime: 1000 * 60 * 5,
	});

	const searchReposQuery = useQuery({
		queryKey: ["github-search-repos", debouncedSearch, selectedRepo?.owner],
		queryFn: async () => {
			if (!debouncedSearch.trim()) return [];
			const result = await searchReposAction({
				query: debouncedSearch,
				org: selectedRepo?.owner,
			});
			if (result.success) {
				return result.repos;
			}
			return [];
		},
		enabled: open && !!debouncedSearch.trim(),
		staleTime: 1000 * 60 * 2,
		placeholderData: (prev) => prev,
	});

	const handleSelect = (repo: GitHubSearchRepo) => {
		onSelectRepo({
			owner: repo.owner,
			repo: repo.name,
		});
		setOpen(false);
		setSearch("");
	};

	const formatStars = (count: number) => {
		if (count >= 1000) {
			return `${(count / 1000).toFixed(1)}k`;
		}
		return count.toString();
	};

	const isDebouncing = search !== debouncedSearch;
	const hasSearchData =
		searchReposQuery.data && searchReposQuery.data.length > 0;
	const isInitialLoading =
		(isDebouncing && !hasSearchData) ||
		(searchReposQuery.isLoading && !hasSearchData) ||
		orgReposQuery.isLoading ||
		(featuredReposQuery.isLoading && initialFeaturedRepos.length === 0);
	const isRefetching = searchReposQuery.isFetching && hasSearchData;

	const getDisplayRepos = () => {
		if (search.trim()) {
			return searchReposQuery.data ?? [];
		}
		if (selectedRepo?.owner) {
			return orgReposQuery.data ?? [];
		}
		return featuredReposQuery.data ?? [];
	};

	const displayRepos = getDisplayRepos();

	const getHeading = () => {
		if (search.trim()) {
			return "Search results";
		}
		if (selectedRepo?.owner) {
			return `Popular repos from ${selectedRepo.owner}`;
		}
		return "Popular repositories";
	};

	return (
		<Popover open={open} onOpenChange={setOpen} modal>
			<PopoverTrigger asChild>
				<PromptInputButton size="sm">
					{selectedRepo ? (
						<>
							<Image
								src={`https://github.com/${selectedRepo.owner}.png?size=40`}
								alt={selectedRepo.owner}
								width={16}
								height={16}
								className="rounded-full"
								unoptimized
							/>
							<span>
								{selectedRepo.owner}/{selectedRepo.repo}
							</span>
						</>
					) : (
						<>
							<GitFork className="size-4" />
							<span>Select repo</span>
						</>
					)}
				</PromptInputButton>
			</PopoverTrigger>
			<PopoverContent
				className="w-[min(400px,calc(100vw-2rem))] p-0"
				align="start"
			>
				<Command shouldFilter={false}>
					<div className="relative">
						<CommandInput
							placeholder="Search GitHub repositories..."
							value={search}
							onValueChange={setSearch}
						/>
						{isRefetching && (
							<div className="absolute right-3 top-1/2 -translate-y-1/2">
								<Loader2 className="size-3 animate-spin text-muted-foreground" />
							</div>
						)}
					</div>
					<CommandList>
						{isInitialLoading ? (
							<div className="flex items-center justify-center py-6">
								<Loader2 className="size-4 animate-spin text-muted-foreground" />
							</div>
						) : displayRepos.length === 0 ? (
							<CommandEmpty>No repositories found.</CommandEmpty>
						) : (
							<CommandGroup heading={getHeading()}>
								{displayRepos.map((repo) => (
									<CommandItem
										key={repo.id}
										value={repo.fullName}
										onSelect={() => handleSelect(repo)}
										className="flex items-start gap-3 py-2"
									>
										<Image
											src={`https://github.com/${repo.owner}.png?size=40`}
											alt={repo.owner}
											width={20}
											height={20}
											className="rounded-full mt-0.5"
											unoptimized
										/>
										<div className="flex flex-col flex-1 min-w-0">
											<div className="flex items-center gap-2">
												<span className="font-medium truncate">
													{repo.fullName}
												</span>
												{repo.private && (
													<span className="text-xs bg-muted px-1.5 py-0.5 rounded">
														Private
													</span>
												)}
											</div>
											{repo.description && (
												<span className="text-xs text-muted-foreground truncate">
													{repo.description}
												</span>
											)}
											<div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
												{repo.language && <span>{repo.language}</span>}
												<span className="flex items-center gap-1">
													<Star className="size-3" />
													{formatStars(repo.stargazersCount)}
												</span>
											</div>
										</div>
										{selectedRepo?.owner === repo.owner &&
											selectedRepo?.repo === repo.name && (
												<CheckIcon className="size-4 ml-auto shrink-0" />
											)}
									</CommandItem>
								))}
							</CommandGroup>
						)}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
