#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import { createOpencode } from "@opencode-ai/sdk";
import {
	createVirtualBash,
	createVirtualBashMCPServer,
} from "../src/sandbox/index";

async function main() {
	console.log("Testing @packages/ai sandbox with OpenCode SDK...\n");

	const virtualBash = createVirtualBash({
		gitClone: {
			credentialProvider: async () => {
				return process.env.GITHUB_TOKEN || null;
			},
			allowedHosts: ["github.com"],
		},
	});

	console.log("=== Step 1: Clone Repository into Virtual FS ===");
	const startTime = Date.now();
	const cloneResult = await virtualBash.exec(
		"git clone --depth 1 https://github.com/godotengine/godot.git /repo",
	);
	const cloneTime = ((Date.now() - startTime) / 1000).toFixed(2);
	console.log(`Exit Code: ${cloneResult.exitCode}`);
	console.log(`Clone time: ${cloneTime}s`);
	console.log(`Stdout: ${cloneResult.stdout}`);
	if (cloneResult.stderr) console.log(`Stderr: ${cloneResult.stderr}`);

	console.log("\n=== Verification: Virtual FS Check ===");
	console.log("Checking if /repo exists in REAL filesystem: ");
	const realFsCheck = spawnSync("ls", ["-la", "/repo"], { encoding: "utf-8" });
	if (realFsCheck.status === 0) {
		console.log("WARNING: /repo exists in real filesystem!");
	} else {
		console.log("/repo does NOT exist in real filesystem (expected) ✓");
	}
	console.log("\nChecking if /repo exists in VIRTUAL filesystem:");
	const virtualFsCheck = await virtualBash.exec("ls /repo | head -5");
	if (virtualFsCheck.exitCode === 0) {
		console.log("/repo EXISTS in virtual filesystem ✓");
		console.log(`First 5 items:\n${virtualFsCheck.stdout}`);
	} else {
		console.log("ERROR: /repo not found in virtual filesystem");
	}

	console.log("\n=== Step 2: Start Virtual Bash MCP Server ===");

	const mcpServer = createVirtualBashMCPServer({
		virtualBash,
		port: 21214,
		toolDescription:
			"Execute commands in a virtualized bash environment. The repository has been cloned to /repo. Use this tool to explore files, run commands like ls, cat, head, tail, grep, find, etc. This is an IN-MEMORY virtual filesystem - it does NOT access the real disk. Use this tool for ALL file operations.",
	});
	console.log(`Virtual Bash MCP server running at: ${mcpServer.url}`);

	console.log("\n=== Step 3: Starting OpenCode Session ===");

	const { client, server: opcodeServer } = await createOpencode({
		port: 21213,
		timeout: 30000,
		config: {
			tools: {
				bash: false,
				write: false,
				edit: false,
				read: false,
				glob: false,
				grep: false,
				list: false,
				patch: false,
			},
			mcp: {
				"virtual-bash": {
					type: "remote",
					url: mcpServer.url,
					enabled: true,
				},
			},
		},
	});

	console.log(`OpenCode server running at: ${opcodeServer.url}`);
	console.log("Built-in file tools DISABLED, using virtual_bash MCP tool");

	try {
		const session = await client.session.create({
			body: { title: "Virtual Bash Repository Analysis" },
		});

		const sessionId = session.data!.id;
		console.log(`Created session: ${sessionId}`);

		console.log("\n=== Step 4: Subscribing to Events ===");
		const eventResult = await client.event.subscribe();
		const eventStream = eventResult.stream;

		let assistantResponse = "";
		let responseComplete = false;

		let lastTextLength = 0;

		const eventPromise = (async () => {
			for await (const event of eventStream) {
				if (event.type === "message.part.updated") {
					const part = event.properties.part;
					if (part.sessionID === sessionId) {
						if (part.type === "text") {
							const fullText = part.text || "";
							const newText = fullText.slice(lastTextLength);
							if (newText) {
								process.stdout.write(newText);
								assistantResponse += newText;
								lastTextLength = fullText.length;
							}
						} else if (part.type === "tool") {
							console.log("\n[TOOL CALL]");
						}
					}
				} else if (event.type === "session.status") {
					if (
						event.properties.sessionID === sessionId &&
						event.properties.status.type === "idle"
					) {
						responseComplete = true;
						break;
					}
				} else if (event.type === "session.error") {
					console.error("\nSession error:", event.properties.error);
					break;
				}
			}
		})();

		const prompt = `You have access to a virtual_bash tool that runs commands in an in-memory virtual filesystem.

The Godot game engine repository has been cloned to /repo. Please use the virtual_bash tool to:
1. Count total number of files in the repo
2. List the top-level directories  
3. Find and count C++ files (.cpp)
4. Look for any image files (.png, .jpg, .svg) and count them
5. Check the size of the repo by looking at file counts per directory

Remember: Use the virtual_bash tool for ALL operations.`;

		console.log("\n=== Step 5: Sending Prompt to OpenCode ===");
		console.log("Prompt:", `${prompt.substring(0, 100)}...\n`);

		await client.session.prompt({
			path: { id: sessionId },
			body: {
				parts: [{ type: "text", text: prompt }],
				model: {
					providerID: "anthropic",
					modelID: "claude-opus-4-5-20251101",
				},
			},
		});

		console.log("\n=== OpenCode Response ===\n");

		const timeout = setTimeout(() => {
			if (!responseComplete) {
				console.log("\n\n[Timeout - stopping event stream]");
				eventStream.return?.(undefined);
			}
		}, 120000);

		await eventPromise;
		clearTimeout(timeout);

		console.log("\n\n=== Session Complete ===");
		console.log(`Session ID: ${sessionId}`);
		console.log(`Response length: ${assistantResponse.length} chars`);
	} finally {
		console.log("\nShutting down servers...");
		mcpServer.stop();
		opcodeServer.close();
	}
}

main().catch(console.error);
