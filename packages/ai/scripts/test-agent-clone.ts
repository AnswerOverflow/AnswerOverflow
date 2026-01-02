#!/usr/bin/env bun
import { gateway, generateText, stepCountIs } from "ai";
import { createSandboxTool, createVirtualBash } from "../src/sandbox/index";

async function main() {
	console.log("Testing sandbox tool with cloned repo...\n");

	const virtualBash = createVirtualBash({
		gitClone: {
			credentialProvider: async () => process.env.GITHUB_TOKEN ?? null,
			allowedHosts: ["github.com"],
		},
	});

	console.log("=== Cloning repo ===");
	const start = Date.now();
	const result = await virtualBash.exec(
		"git clone https://github.com/facebook/react /repo",
	);
	console.log(`Clone time: ${((Date.now() - start) / 1000).toFixed(2)}s`);
	console.log(result.stdout);

	const sandboxTool = createSandboxTool({ virtualBash });

	console.log("=== Calling AI with sandbox tool ===\n");
	const aiStart = Date.now();

	const response = await generateText({
		model: gateway("zai/glm-4.6"),
		providerOptions: {
			gateway: {
				order: ["cerebras"],
			},
		},
		tools: { sandbox: sandboxTool },
		stopWhen: stepCountIs(10),
		toolChoice: "auto",
		system: `You have access to a sandbox tool that runs bash commands in a virtual filesystem.
The React repository has been cloned to /repo.
Use the sandbox tool to explore and answer questions.`,
		prompt:
			"What are the top-level directories in the React repo? And how many TypeScript files are there?",
	});

	console.log(`AI time: ${((Date.now() - aiStart) / 1000).toFixed(2)}s`);
	console.log("Steps count:", response.steps.length);

	console.log("=== Response ===");
	console.log("Finish reason:", response.finishReason);
	console.log("Text:", response.text);

	console.log("\n=== Steps ===");
	for (let i = 0; i < response.steps.length; i++) {
		const step = response.steps[i];
		console.log(`\nStep ${i + 1} (${step.finishReason}):`);
		for (const result of step.toolResults) {
			const input = (result as { input?: { command?: string } }).input;
			const output = (result as { output?: { stdout?: string } }).output;
			console.log(`  $ ${input?.command}`);
			const stdout = output?.stdout ?? "";
			if (stdout.length > 200) {
				console.log(`  → ${stdout.slice(0, 200)}...`);
			} else {
				console.log(`  → ${stdout}`);
			}
		}
		if (step.text) {
			console.log(`  Text: ${step.text.slice(0, 300)}...`);
		}
	}
}

main().catch(console.error);
