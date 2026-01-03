#!/usr/bin/env bun
import { createOpencode } from "@opencode-ai/sdk";

async function testBasicSDK() {
	console.log("=== OpenCode SDK Basic Test ===\n");

	const { client, server } = await createOpencode({
		port: 21215,
		timeout: 30000,
	});

	console.log(`Server running at: ${server.url}`);

	try {
		console.log("\n--- Health Check ---");
		const health = await client.global.health();
		console.log("Health:", health.data);

		console.log("\n--- List Agents ---");
		const agents = await client.app.agents();
		console.log("Available agents:", agents.data?.map((a) => a.id).join(", "));

		console.log("\n--- Config ---");
		const config = await client.config.get();
		console.log("Config loaded:", !!config.data);

		console.log("\n--- Providers ---");
		const providers = await client.config.providers();
		console.log(
			"Providers:",
			providers.data?.providers?.map((p) => p.id).join(", "),
		);

		console.log("\n--- Create Session ---");
		const session = await client.session.create({
			body: { title: "SDK Test Session" },
		});
		const sessionId = session.data!.id;
		console.log("Session ID:", sessionId);

		console.log("\n--- List Sessions ---");
		const sessions = await client.session.list();
		console.log("Total sessions:", sessions.data?.length);

		console.log("\n--- Send Simple Prompt ---");
		const eventResult = await client.event.subscribe();
		const eventStream = eventResult.stream;

		let responseText = "";
		let lastTextLength = 0;

		const eventPromise = (async () => {
			for await (const event of eventStream) {
				if (event.type === "message.part.updated") {
					const part = event.properties.part;
					if (part.sessionID === sessionId && part.type === "text") {
						const fullText = part.text || "";
						const newText = fullText.slice(lastTextLength);
						if (newText) {
							process.stdout.write(newText);
							responseText += newText;
							lastTextLength = fullText.length;
						}
					}
				} else if (event.type === "session.status") {
					if (
						event.properties.sessionID === sessionId &&
						event.properties.status.type === "idle"
					) {
						break;
					}
				} else if (event.type === "session.error") {
					console.error("\nSession error:", event.properties.error);
					break;
				}
			}
		})();

		await client.session.prompt({
			path: { id: sessionId },
			body: {
				parts: [
					{
						type: "text",
						text: "Say hello in exactly 5 words. Nothing more.",
					},
				],
				model: {
					providerID: "anthropic",
					modelID: "claude-sonnet-4-20250514",
				},
			},
		});

		const timeout = setTimeout(() => {
			console.log("\n[Timeout reached]");
			eventStream.return?.(undefined);
		}, 30000);

		await eventPromise;
		clearTimeout(timeout);

		console.log("\n\n--- Response Stats ---");
		console.log("Response length:", responseText.length, "chars");

		console.log("\n--- Get Session Messages ---");
		const messages = await client.session.messages({
			path: { id: sessionId },
		});
		console.log("Messages in session:", messages.data?.length);

		console.log("\n--- Delete Session ---");
		await client.session.delete({ path: { id: sessionId } });
		console.log("Session deleted");

		console.log("\n=== All Tests Passed ===");
	} finally {
		server.close();
		console.log("\nServer closed.");
	}
}

testBasicSDK().catch((error) => {
	console.error("Test failed:", error);
	process.exit(1);
});
