#!/usr/bin/env bun

import { spawn, spawnSync } from "node:child_process";
import { kill } from "node:process";

spawnSync("bun", ["run", "generate-function-types"], {
	stdio: "inherit",
	shell: false,
});

const chokidar = spawn("bun", ["run", "generate-function-types:watch"], {
	stdio: "inherit",
	shell: false,
});

const convex = spawn("convex", ["dev"], {
	stdio: "inherit",
	shell: false,
});

const cleanup = () => {
	if (chokidar.pid) {
		kill(chokidar.pid, "SIGTERM");
	}
	if (convex.pid) {
		kill(convex.pid, "SIGTERM");
	}
	process.exit(0);
};

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);

chokidar.on("exit", () => {
	if (convex.pid) {
		kill(convex.pid, "SIGTERM");
	}
	process.exit(0);
});

convex.on("exit", () => {
	if (chokidar.pid) {
		kill(chokidar.pid, "SIGTERM");
	}
	process.exit(0);
});
