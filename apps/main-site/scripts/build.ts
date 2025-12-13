import { $ } from "bun";

$.throws(true);

process.env.NEXT_PUBLIC_ANALYTICS_PATH = crypto.randomUUID().slice(0, 8);

const previousSha = process.env.VERCEL_GIT_PREVIOUS_SHA;
const currentSha = process.env.VERCEL_GIT_COMMIT_SHA;

let shouldDeployConvex = true;

if (previousSha && currentSha) {
	const result =
		await $`git diff --name-only ${previousSha} ${currentSha}`.text();
	const changedFiles = result.split("\n").filter(Boolean);
	shouldDeployConvex = changedFiles.some((file) =>
		file.startsWith("packages/database/convex/"),
	);
}

if (shouldDeployConvex) {
	console.log("Convex files changed, deploying...");
	await $`npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL`.cwd(
		"../../packages/database",
	);
} else {
	console.log("No Convex changes detected, skipping deploy");
}

await $`bun run build`;
