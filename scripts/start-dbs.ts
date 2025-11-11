#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";

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

async function checkNgrokApi(): Promise<boolean> {
	try {
		await $`curl -s --connect-timeout 2 http://localhost:4040/api/tunnels`.quiet();
		return true;
	} catch {
		return false;
	}
}

async function getNgrokUrl(): Promise<{
	url: string | null;
	tunnels: unknown[];
}> {
	try {
		// Check if ngrok is running and get the tunnel URL
		const result =
			await $`curl -s --connect-timeout 2 http://localhost:4040/api/tunnels`.quiet();
		const response = result.stdout.toString();
		if (!response || response.trim() === "") {
			return { url: null, tunnels: [] };
		}
		const tunnels = JSON.parse(response);
		const tunnelList = tunnels.tunnels || [];
		// Look for TCP tunnel to localhost:6379 (Valkey uses TCP, not HTTP)
		const tcpTunnel = tunnelList.find(
			(t: { proto: string; config: { addr: string } }) =>
				t.proto === "tcp" && t.config.addr === "localhost:6379",
		);
		return { url: tcpTunnel?.public_url || null, tunnels: tunnelList };
	} catch {
		return { url: null, tunnels: [] };
	}
}

async function checkPortListening(port: number): Promise<boolean> {
	try {
		const result = await $`lsof -i :${port} 2>/dev/null || echo ""`.quiet();
		return result.stdout.toString().trim() !== "";
	} catch {
		return false;
	}
}

function isTunnelObject(
	t: unknown,
): t is { proto: string; config: { addr: string }; public_url: string } {
	if (typeof t !== "object" || t === null) {
		return false;
	}

	const proto = "proto" in t ? t.proto : undefined;
	const config = "config" in t ? t.config : undefined;
	const publicUrl = "public_url" in t ? t.public_url : undefined;

	if (typeof proto !== "string" || typeof publicUrl !== "string") {
		return false;
	}

	if (typeof config !== "object" || config === null) {
		return false;
	}

	const addr = "addr" in config ? config.addr : undefined;
	return typeof addr === "string";
}

async function startNgrok(): Promise<string> {
	// Check if Valkey is listening on port 6379
	const valkeyListening = await checkPortListening(6379);
	if (!valkeyListening) {
		throw new Error(
			"Valkey is not listening on port 6379. Make sure Docker services are running.\n" +
				"  Try: docker compose up -d",
		);
	}

	// Check if ngrok is already running
	const { url: existingUrl, tunnels: existingTunnels } = await getNgrokUrl();
	if (existingUrl) {
		console.log(`✓ ngrok already running: ${existingUrl}`);
		return existingUrl;
	}

	// Check if ngrok API is accessible (might be running but no tunnel)
	const apiAccessible = await checkNgrokApi();
	if (apiAccessible && existingTunnels.length > 0) {
		console.log("⚠ ngrok is running but no tunnel to localhost:6379 found");
		console.log(`  Existing tunnels: ${existingTunnels.length}`);
		console.log("  Starting new tunnel...");
	}

	console.log("Starting ngrok TCP tunnel to Valkey (port 6379)...");

	// Start ngrok as a background daemon process that persists
	// Using TCP tunnel since Valkey uses Redis protocol (binary), not HTTP
	// Use Bun.spawn to start ngrok in the background
	try {
		const ngrokProcess = Bun.spawn(["ngrok", "tcp", "6379"], {
			stdout: "ignore",
			stderr: "ignore",
		});

		// Detach the process so it can outlive the parent
		// On Unix systems, we need to unref and potentially disown
		ngrokProcess.unref();

		// Give it a moment to start
		await new Promise((resolve) => setTimeout(resolve, 500));

		// Check if process is still running (if it exited immediately, there was an error)
		if (ngrokProcess.exitCode !== null && ngrokProcess.exitCode !== 0) {
			throw new Error(
				`ngrok process exited with code ${ngrokProcess.exitCode}`,
			);
		}
	} catch (error) {
		// Check if ngrok is already running (might fail if process exists)
		const isRunning = await checkNgrokApi();
		if (!isRunning) {
			throw new Error(
				`ngrok failed to start\n` +
					`  Error: ${error instanceof Error ? error.message : String(error)}\n` +
					`  Make sure ngrok is properly installed and authenticated.\n` +
					`  Get your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken\n` +
					`  Then run: ngrok config add-authtoken <your-token>`,
			);
		}
	}

	// Wait for ngrok to start and API to be accessible
	console.log("  Waiting for ngrok to start...");
	let apiReady = false;
	let waitAttempts = 0;
	while (!apiReady && waitAttempts < 15) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		apiReady = await checkNgrokApi();
		waitAttempts++;
		if (!apiReady && waitAttempts % 3 === 0) {
			console.log(`  Still waiting... (${waitAttempts}s)`);
		}
	}

	if (!apiReady) {
		throw new Error(
			"ngrok API did not become accessible after starting.\n" +
				"  Troubleshooting:\n" +
				"  1. Check if ngrok is running: ps aux | grep ngrok\n" +
				"  2. Check ngrok logs for errors\n" +
				"  3. Make sure port 4040 is not in use\n" +
				"  4. Try running manually: ngrok tcp 6379",
		);
	}

	console.log("  ngrok API is accessible, checking for tunnel...");

	// Try to get the URL
	let url: string | null = null;
	let attempts = 0;
	const maxAttempts = 15;
	while (!url && attempts < maxAttempts) {
		await new Promise((resolve) => setTimeout(resolve, 1000));
		const result = await getNgrokUrl();
		url = result.url;
		attempts++;
		if (!url && attempts % 3 === 0) {
			console.log(`  Waiting for tunnel... (${attempts}s)`);
			if (result.tunnels.length > 0) {
				console.log(
					`  Found ${result.tunnels.length} tunnel(s), but none match localhost:6379`,
				);
			}
		}
	}

	if (!url) {
		const { tunnels } = await getNgrokUrl();
		let errorMsg =
			"Failed to get ngrok tunnel URL after starting.\n" +
			"  Troubleshooting:\n" +
			"  1. Check ngrok web UI: http://localhost:4040\n";
		if (tunnels.length > 0) {
			errorMsg += `  2. Found ${tunnels.length} tunnel(s) but none match localhost:6379\n`;
			const tunnelInfo = tunnels
				.map((t) => {
					if (isTunnelObject(t)) {
						return `${t.proto}://${t.config.addr} -> ${t.public_url}`;
					}
					return String(t);
				})
				.join(", ");
			errorMsg += `  3. Existing tunnels: ${tunnelInfo}\n`;
		} else {
			errorMsg +=
				"  2. No tunnels found - ngrok may have failed to create tunnel\n";
		}
		errorMsg +=
			"  4. Check if Valkey is running: docker ps | grep valkey\n" +
			"  5. Try running manually: ngrok tcp 6379";
		throw new Error(errorMsg);
	}

	console.log(`✓ ngrok tunnel started: ${url}`);
	return url;
}

function hasValkeyUrl(): boolean {
	if (!existsSync(ENV_PATH)) {
		return false;
	}
	const envContent = readFileSync(ENV_PATH, "utf-8");
	return envContent.includes("VALKEY_URL=");
}

function updateEnv(valkeyUrl: string): void {
	let envContent = "";
	if (existsSync(ENV_PATH)) {
		envContent = readFileSync(ENV_PATH, "utf-8");
	}

	// Check if VALKEY_URL already exists - if so, update it (ngrok URLs change on restart)
	if (hasValkeyUrl()) {
		const lines = envContent.split("\n");
		const updatedLines = lines.map((line) => {
			if (line.startsWith("VALKEY_URL=")) {
				return `VALKEY_URL=${valkeyUrl}`;
			}
			return line;
		});
		envContent = updatedLines.join("\n");
		// Ensure trailing newline
		if (!envContent.endsWith("\n")) {
			envContent += "\n";
		}
		writeFileSync(ENV_PATH, envContent);
		console.log(`✓ Updated VALKEY_URL in .env`);
	} else {
		// Add VALKEY_URL if it doesn't exist
		if (envContent && !envContent.endsWith("\n")) {
			envContent += "\n";
		}
		envContent += `VALKEY_URL=${valkeyUrl}\n`;
		writeFileSync(ENV_PATH, envContent);
		console.log(`✓ Added VALKEY_URL to .env`);
	}
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
		// Check if ngrok is installed
		try {
			await $`which ngrok`.quiet();
		} catch {
			console.error("Error: ngrok is not installed. Please install it first:");
			console.error("  brew install ngrok/ngrok/ngrok");
			process.exit(1);
		}

		await startDockerServices();
		const ngrokUrl = await startNgrok();

		// Convert ngrok TCP URL to Redis URL format
		// ngrok TCP gives us something like tcp://0.tcp.ngrok.io:12345
		// We need to convert it to redis:// format
		// Extract host and port from tcp://host:port
		const urlMatch = ngrokUrl.match(/^tcp:\/\/(.+):(\d+)$/);
		if (!urlMatch) {
			throw new Error(`Invalid ngrok URL format: ${ngrokUrl}`);
		}
		const [, host, port] = urlMatch;
		const redisUrl = `redis://${host}:${port}`;

		updateEnv(redisUrl);
		await updateConvexEnv(redisUrl);

		console.log("\n✓ Database services are ready!");
		console.log(`  Valkey URL: ${redisUrl}`);
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
