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
import { useDeferredValue, useState } from "react";
import type { GitHubRepo } from "./chat-interface";

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

type GitHubRepoSelectorProps = {
	selectedRepo: GitHubRepo | null;
	onSelectRepo: (repo: GitHubRepo | null) => void;
};

export function GitHubRepoSelector({
	selectedRepo,
	onSelectRepo,
}: GitHubRepoSelectorProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const deferredSearch = useDeferredValue(search);

	const searchReposAction = useAction(api.authenticated.github.searchRepos);
	const getOrgReposAction = useAction(api.authenticated.github.getOrgRepos);

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

	const searchReposQuery = useQuery({
		queryKey: ["github-search-repos", deferredSearch, selectedRepo?.owner],
		queryFn: async () => {
			if (!deferredSearch.trim()) return [];
			const result = await searchReposAction({
				query: deferredSearch,
				org: selectedRepo?.owner,
			});
			if (result.success) {
				return result.repos;
			}
			return [];
		},
		enabled: open && !!deferredSearch.trim(),
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

	const isLoading = searchReposQuery.isLoading || orgReposQuery.isLoading;
	const displayRepos = search.trim()
		? (searchReposQuery.data ?? [])
		: (orgReposQuery.data ?? []);
	const showOrgReposSection =
		!search.trim() && (orgReposQuery.data?.length ?? 0) > 0;

	return (
		<Popover open={open} onOpenChange={setOpen}>
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
			<PopoverContent className="w-[400px] p-0" align="start" modal={true}>
				<Command shouldFilter={false}>
					<CommandInput
						placeholder="Search GitHub repositories..."
						value={search}
						onValueChange={setSearch}
					/>
					<CommandList>
						{isLoading ? (
							<div className="flex items-center justify-center py-6">
								<Loader2 className="size-4 animate-spin text-muted-foreground" />
							</div>
						) : displayRepos.length === 0 ? (
							<CommandEmpty>
								{search.trim()
									? "No repositories found."
									: selectedRepo
										? `No repositories found for ${selectedRepo.owner}`
										: "Type to search repositories..."}
							</CommandEmpty>
						) : (
							<CommandGroup
								heading={
									showOrgReposSection
										? `Popular repos from ${selectedRepo?.owner}`
										: "Search results"
								}
							>
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
