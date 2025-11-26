#!/usr/bin/env bun

import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "dotenv";

const envFile = join(process.cwd(), "../../.env.production");

if (!existsSync(envFile)) {
	console.error(`Environment file not found: ${envFile}`);
	process.exit(1);
}

const envContent = readFileSync(envFile, "utf-8");
const parsed = parse(envContent);

const envVars = Object.entries(parsed).map(([name, value]) => ({
	name,
	value: value ?? "",
}));

if (envVars.length === 0) {
	console.error(`No environment variables found in ${envFile}`);
	process.exit(1);
}

console.log(`Syncing ${envVars.length} environment variables to production...`);

for (const { name, value } of envVars) {
	console.log(`Setting ${name}`);
	const proc = spawn("bunx", ["convex", "env", "set", "--prod", name, value], {
		stdio: "inherit",
		shell: false,
	});

	await new Promise<void>((resolve, reject) => {
		proc.on("exit", (code) => {
			if (code === 0) {
				resolve();
			} else {
				reject(new Error(`Failed to set ${name}`));
			}
		});
		proc.on("error", reject);
	});
}

console.log("✅ Successfully synced all environment variables to production");
