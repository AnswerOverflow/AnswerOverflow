#!/usr/bin/env bun

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { $ } from "bun";

const ENV_PATH = join(process.cwd(), ".env");
const VALKEY_CONTAINER = "valkey";
const JAEGER_CONTAINER = "jaeger";

async function isContainerRunning(containerName: string): Promise<boolean> {
	try {
		const result =
			await $`docker ps --filter name=${containerName} --format {{.Names}}`.quiet();
		return result.stdout.toString().trim() === containerName;
	} catch {
		return false;
	}
}

async function startDockerServices(): Promise<void> {
	const valkeyRunning = await isContainerRunning(VALKEY_CONTAINER);
	const jaegerRunning = await isContainerRunning(JAEGER_CONTAINER);

	if (valkeyRunning && jaegerRunning) {
		console.log("✓ Docker services already running");
		return;
	}

	console.log("Starting Docker services...");
	try {
		await $`docker compose up -d`.quiet();
		console.log("✓ Docker services started");

		// Wait a moment for services to be ready
		await new Promise((resolve) => setTimeout(resolve, 2000));

		// Verify Valkey is actually running
		const valkeyReady = await isContainerRunning(VALKEY_CONTAINER);
		if (!valkeyReady) {
			throw new Error("Valkey container failed to start");
		}
	} catch (error) {
		throw new Error(
			`Failed to start Docker services: ${error instanceof Error ? error.message : String(error)}\n` +
				"  Troubleshooting:\n" +
				"  1. Check if Docker is running: docker ps\n" +
				"  2. Check docker-compose.yml is valid\n" +
				"  3. Try running manually: docker compose up -d",
		);
	}
}

function getValkeyUrlFromEnv(): string {
	if (!existsSync(ENV_PATH)) {
		throw new Error(
			`.env file not found at ${ENV_PATH}\n` +
				"  Please create a .env file with VALKEY_URL set.\n" +
				"  Example: VALKEY_URL=redis://your-ngrok-host:port",
		);
	}

	const envContent = readFileSync(ENV_PATH, "utf-8");
	const lines = envContent.split("\n");

	for (const line of lines) {
		if (line.startsWith("VALKEY_URL=")) {
			const url = line.substring("VALKEY_URL=".length).trim();
			if (!url) {
				throw new Error(
					"VALKEY_URL is set in .env but is empty.\n" +
						"  Please set VALKEY_URL to your Valkey/Redis URL.\n" +
						"  Example: VALKEY_URL=redis://your-ngrok-host:port",
				);
			}
			return url;
		}
	}

	throw new Error(
		"VALKEY_URL not found in .env file.\n" +
			"  Please add VALKEY_URL to your .env file.\n" +
			"  Example: VALKEY_URL=redis://your-ngrok-host:port",
	);
}

async function updateConvexEnv(valkeyUrl: string): Promise<void> {
	const databaseDir = join(process.cwd(), "packages", "database");
	try {
		console.log("  Updating VALKEY_URL in Convex...");
		await $`cd ${databaseDir} && bunx convex env set VALKEY_URL ${valkeyUrl}`.quiet();
		console.log("✓ Updated VALKEY_URL in Convex");
	} catch (error) {
		console.warn(
			`⚠ Failed to update VALKEY_URL in Convex: ${error instanceof Error ? error.message : String(error)}\n` +
				`  You may need to set it manually: cd packages/database && bunx convex env set VALKEY_URL ${valkeyUrl}`,
		);
	}
}

async function main() {
	try {
		await startDockerServices();
		const valkeyUrl = getValkeyUrlFromEnv();

		console.log(`✓ Using VALKEY_URL from .env: ${valkeyUrl}`);
		await updateConvexEnv(valkeyUrl);

		console.log("\n✓ Database services are ready!");
		console.log(`  Valkey URL: ${valkeyUrl}`);
	} catch (error) {
		console.error("\n❌ Error starting database services:");
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(String(error));
		}
		console.error("\nFor more help, check the troubleshooting steps above.");
		process.exit(1);
	}
}

main();
