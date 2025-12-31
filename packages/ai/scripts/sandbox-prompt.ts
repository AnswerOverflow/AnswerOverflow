#!/usr/bin/env bun
import { createOpencode } from "@opencode-ai/sdk";
import {
	createVirtualBash,
	createVirtualBashMCPServer,
} from "../src/sandbox/index.ts";

const args = process.argv.slice(2);

if (args.length < 2) {
	console.error("Usage: bun run sandbox-prompt.ts <git-repo-url> <prompt>");
	console.error(
		'Example: bun run sandbox-prompt.ts https://github.com/user/repo "What does this codebase do?"',
	);
	process.exit(1);
}

const repoUrl = args[0]!;
const prompt = args.slice(1).join(" ");

async function main() {
	const virtualBash = createVirtualBash({
		gitClone: {
			credentialProvider: async () => process.env.GITHUB_TOKEN || null,
			allowedHosts: ["github.com"],
		},
	});

	console.error(`Cloning ${repoUrl}...`);
	const cloneResult = await virtualBash.exec(
		`git clone --depth 1 ${repoUrl} /repo`,
	);

	if (cloneResult.exitCode !== 0) {
		console.error("Failed to clone repository:", cloneResult.stderr);
		process.exit(1);
	}

	console.error(cloneResult.stdout.trim());

	const mcpServer = createVirtualBashMCPServer({
		virtualBash,
		port: 21214,
		toolDescription:
			"Execute commands in a virtualized bash environment. The repository has been cloned to /repo. Use this tool to explore files, run commands like ls, cat, head, tail, grep, find, etc. This is an IN-MEMORY virtual filesystem - it does NOT access the real disk. Use this tool for ALL file operations.",
	});

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

	try {
		const session = await client.session.create({
			body: { title: "Sandbox Prompt" },
		});

		const sessionId = session.data!.id;

		const eventResult = await client.event.subscribe();
		const eventStream = eventResult.stream;

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
								lastTextLength = fullText.length;
							}
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

		const fullPrompt = `You have access to a virtual_bash tool that runs commands in an in-memory virtual filesystem.

A repository has been cloned to /repo. Use the virtual_bash tool to explore and answer questions about it.

User request: ${prompt}`;

		await client.session.prompt({
			path: { id: sessionId },
			body: {
				parts: [{ type: "text", text: fullPrompt }],
				model: {
					providerID: "anthropic",
					modelID: "claude-sonnet-4-20250514",
				},
			},
		});

		const timeout = setTimeout(() => {
			if (!responseComplete) {
				console.error("\n\n[Timeout]");
				eventStream.return?.(undefined);
			}
		}, 300000);

		await eventPromise;
		clearTimeout(timeout);

		console.log("");
	} finally {
		mcpServer.stop();
		opcodeServer.close();
	}
}

main().catch((error) => {
	console.error("Error:", error);
	process.exit(1);
});
