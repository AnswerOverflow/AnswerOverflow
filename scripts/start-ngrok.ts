#!/usr/bin/env bun

import { spawn } from "bun";

const NGROK_API_URL = "http://127.0.0.1:4040/api/tunnels";

async function waitForNgrok(): Promise<void> {
	for (let i = 0; i < 20; i++) {
		try {
			const response = await fetch(NGROK_API_URL);
			if (response.ok) {
				return;
			}
		} catch {}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	throw new Error("Ngrok failed to start");
}

async function getNgrokUrl(): Promise<string> {
	const response = await fetch(NGROK_API_URL);
	if (!response.ok) {
		throw new Error("Failed to fetch ngrok API");
	}
	const data = await response.json();
	const tunnels = data.tunnels;
	if (!tunnels || tunnels.length === 0) {
		throw new Error("No tunnels found");
	}
	const httpsTunnel = tunnels.find(
		(t: { proto: string }) => t.proto === "https",
	);
	if (httpsTunnel) {
		return httpsTunnel.public_url;
	}
	return tunnels[0].public_url;
}

async function main() {
	const port = process.argv[2] || "3000";
	const ngrokProcess = spawn(["bunx", "ngrok", "http", port], {
		detached: true,
		stdio: ["ignore", "ignore", "ignore"],
	});

	ngrokProcess.unref();

	try {
		await waitForNgrok();
		const url = await getNgrokUrl();
		console.log(`\n✓ Ngrok tunnel active:`);
		console.log(`  ${url} -> http://localhost:${port}\n`);
	} catch (error) {
		ngrokProcess.kill();
		console.error("\n❌ Error starting ngrok:");
		if (error instanceof Error) {
			console.error(error.message);
		} else {
			console.error(String(error));
		}
		process.exit(1);
	}
}

main();
