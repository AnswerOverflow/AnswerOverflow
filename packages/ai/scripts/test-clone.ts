#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { createVirtualBash } from "../src/sandbox/index";

async function main() {
	const repos = [
		{ owner: "facebook", repo: "react", branch: "main" },
		{ owner: "microsoft", repo: "vscode", branch: "main" },
		{ owner: "godotengine", repo: "godot", branch: "master" },
	];

	console.log("Testing optimized git clone (GitHub Archive API)...\n");

	for (const { owner, repo, branch } of repos) {
		console.log(`=== ${owner}/${repo} ===`);

		const virtualBash = createVirtualBash({
			gitClone: {
				credentialProvider: async () => process.env.GITHUB_TOKEN || null,
				allowedHosts: ["github.com"],
			},
		});

		const startTime = Date.now();
		const result = await virtualBash.exec(
			`git clone -b ${branch} https://github.com/${owner}/${repo}.git /repo`,
		);
		const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

		if (result.exitCode !== 0) {
			console.log(`  FAILED: ${result.stderr}`);
			continue;
		}

		const lines = result.stdout.split("\n");
		const copiedLine = lines.find((l) => l.includes("Copied"));
		console.log(`  Time: ${elapsed}s`);
		console.log(`  ${copiedLine}`);

		const realCheck = spawnSync("ls", ["/repo"], { encoding: "utf-8" });
		if (realCheck.status === 0) {
			console.log("  WARNING: /repo leaked to real filesystem!");
		}

		const lsResult = await virtualBash.exec("ls /repo | head -3");
		console.log(`  Files: ${lsResult.stdout.trim().split("\n").join(", ")}`);
		console.log();
	}
}

main().catch(console.error);
