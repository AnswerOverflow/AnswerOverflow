#!/usr/bin/env bun

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const CONTEXT_DIR = join(import.meta.dir, "..", ".context");

const REPOS = [
	{ name: "effect", url: "https://github.com/Effect-TS/effect.git" },
	{
		name: "AnswerOverflow",
		url: "https://github.com/AnswerOverflow/AnswerOverflow.git",
	},
	{
		name: "github-search-agent",
		url: "https://github.com/RhysSullivan/github-search-agent.git",
	},
	{
		name: "better-auth",
		url: "https://github.com/get-convex/better-auth.git",
	},
	{
		name: "convex-backend",
		url: "https://github.com/get-convex/convex-backend.git",
	},
	{ name: "convex-js", url: "https://github.com/get-convex/convex-js.git" },
	{ name: "typelytics", url: "https://github.com/RhysSullivan/typelytics.git" },
	{ name: "tweakcn", url: "https://github.com/jnsahaj/tweakcn.git" },
	{
		name: "effect-atom",
		url: "https://github.com/tim-smart/effect-atom.git",
	},
	{ name: "ai-elements", url: "https://github.com/vercel/ai-elements.git" },
	{ name: "vercel-ai", url: "https://github.com/vercel/ai.git" },
	{ name: "posthog-com", url: "https://github.com/PostHog/posthog.com.git" },
	{ name: "posthog", url: "https://github.com/PostHog/posthog.git" },
];

async function main() {
	if (!existsSync(CONTEXT_DIR)) {
		mkdirSync(CONTEXT_DIR, { recursive: true });
	}

	console.log(`Setting up ${REPOS.length} context repositories...\n`);

	for (const repo of REPOS) {
		const repoPath = join(CONTEXT_DIR, repo.name);

		if (existsSync(repoPath)) {
			console.log(`✓ ${repo.name} (already exists)`);
			continue;
		}

		console.log(`Cloning ${repo.name}...`);
		try {
			await $`git clone --depth 1 ${repo.url} ${repoPath}`.quiet();
			console.log(`✓ ${repo.name}`);
		} catch (_error) {
			console.error(`✗ ${repo.name} - failed to clone`);
		}
	}

	console.log("\nContext setup complete!");
}

main();
