import { spawnSync } from "node:child_process";

const nextArgs = ["next", "build"];

if (process.env.DEPLOY_TARGET === "cloudflare") {
	nextArgs.push("--webpack");
}

const result = spawnSync("bunx", nextArgs, {
	stdio: "inherit",
	env: process.env,
});

if (result.status !== 0) {
	process.exit(result.status ?? 1);
}
