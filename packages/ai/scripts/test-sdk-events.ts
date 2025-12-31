#!/usr/bin/env bun
import { createOpencode } from "@opencode-ai/sdk";

async function testSDKEvents() {
	console.log("=== OpenCode SDK Event Streaming Test ===\n");

	const { client, server } = await createOpencode({
		port: 21216,
		timeout: 30000,
	});

	console.log(`Server running at: ${server.url}`);

	try {
		const session = await client.session.create({
			body: { title: "Event Streaming Test" },
		});
		const sessionId = session.data!.id;
		console.log("Session ID:", sessionId);

		console.log("\n--- Subscribing to Events ---");
		const eventResult = await client.event.subscribe();
		const eventStream = eventResult.stream;

		const eventTypes = new Set<string>();
		let toolCalls = 0;
		let textParts = 0;

		const eventPromise = (async () => {
			for await (const event of eventStream) {
				eventTypes.add(event.type);

				if (event.type === "message.part.updated") {
					const part = event.properties.part;
					if (part.sessionID === sessionId) {
						if (part.type === "text") {
							textParts++;
							const text = part.text || "";
							if (text.length < 100) {
								process.stdout.write(`\r[text] ${text}`);
							} else {
								process.stdout.write(
									`\r[text] ${text.slice(0, 50)}...${text.slice(-30)}`,
								);
							}
						} else if (part.type === "tool") {
							toolCalls++;
							console.log(`\n[tool] ${part.name}`);
						}
					}
				} else if (event.type === "session.status") {
					console.log(`\n[status] ${event.properties.status.type}`);
					if (
						event.properties.sessionID === sessionId &&
						event.properties.status.type === "idle"
					) {
						break;
					}
				} else if (event.type === "session.error") {
					console.error("\n[error]", event.properties.error);
					break;
				}
			}
		})();

		console.log("\n--- Sending Multi-Step Prompt ---\n");

		await client.session.prompt({
			path: { id: sessionId },
			body: {
				parts: [
					{
						type: "text",
						text: `List 3 programming languages and one thing each is known for. Keep it brief.`,
					},
				],
				model: {
					providerID: "anthropic",
					modelID: "claude-sonnet-4-20250514",
				},
			},
		});

		const timeout = setTimeout(() => {
			console.log("\n[Timeout]");
			eventStream.return?.(undefined);
		}, 60000);

		await eventPromise;
		clearTimeout(timeout);

		console.log("\n\n--- Event Summary ---");
		console.log("Event types seen:", [...eventTypes].join(", "));
		console.log("Text updates:", textParts);
		console.log("Tool calls:", toolCalls);

		console.log("\n=== Test Complete ===");
	} finally {
		server.close();
		console.log("Server closed.");
	}
}

testSDKEvents().catch((error) => {
	console.error("Test failed:", error);
	process.exit(1);
});
