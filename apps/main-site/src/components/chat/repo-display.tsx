"use client";

import Image from "next/image";
import type { GitHubRepoContext } from "./chat-interface";

type RepoDisplayProps = {
	repoContext: GitHubRepoContext;
};

export function RepoDisplay({ repoContext }: RepoDisplayProps) {
	const { owner, repo } = repoContext;
	const avatarUrl = `https://github.com/${owner}.png?size=40`;

	return (
		<div className="flex items-center gap-2 px-3 py-2 border-b text-sm text-muted-foreground">
			<Image
				src={avatarUrl}
				alt={owner}
				width={20}
				height={20}
				className="rounded-full"
				unoptimized
			/>
			<span className="font-medium text-foreground">{owner}</span>
			<span className="text-muted-foreground">/</span>
			<span className="font-medium text-foreground">{repo}</span>
		</div>
	);
}
