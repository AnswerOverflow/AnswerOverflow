"use client";

import Image from "next/image";
import type { GitHubRepo } from "./types";

export function ChatEmptyState({
	repo,
	title,
}: {
	repo: GitHubRepo | null;
	title: string | null;
}) {
	if (!repo) {
		return null;
	}

	return (
		<div className="flex flex-1 flex-col items-center justify-center min-h-[50vh]">
			<div className="flex flex-col items-center gap-4 text-center">
				<Image
					src={`https://github.com/${repo.owner}.png?size=128`}
					alt={repo.owner}
					width={64}
					height={64}
					className="rounded-full"
					unoptimized
				/>
				<div className="space-y-2">
					<h1 className="text-2xl font-semibold">{title}</h1>
					<p className="text-muted-foreground">
						Ask questions about the {repo.owner}/{repo.repo} codebase
					</p>
				</div>
			</div>
		</div>
	);
}
