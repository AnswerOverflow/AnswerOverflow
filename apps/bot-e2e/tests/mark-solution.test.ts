import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import {
	CHANNELS,
	E2ELayer,
	GUILD_NAME,
	Selfbot,
	waitForReaction,
} from "../src/core";

const MARK_SOLUTION_COMMAND = "✅ Mark Solution";

it.scoped(
	"should mark a message as solution and add reaction",
	() =>
		Effect.gen(function* () {
			const selfbot = yield* Selfbot;

			yield* selfbot.client.login();
			const guild = yield* selfbot.getGuild(GUILD_NAME);
			const channel = yield* selfbot.getTextChannel(
				guild,
				CHANNELS.MARK_SOLUTION_ENABLED,
			);

			console.log(`Using guild: ${guild.name} (${guild.id})`);
			console.log(`Using channel: ${channel.name} (${channel.id})`);

			const timestamp = new Date().toISOString();

			const message = yield* selfbot.sendMessage(
				channel,
				`E2E Test Question - ${timestamp}`,
			);
			expect(message.id).toBeDefined();

			const thread = yield* selfbot.createThread(
				message,
				`E2E Test Thread ${timestamp}`,
			);
			expect(thread.id).toBeDefined();

			const threadMessage = yield* selfbot.sendMessage(
				thread,
				`This is the answer to mark as solved - ${timestamp}`,
			);
			expect(threadMessage.id).toBeDefined();

			const command = yield* selfbot.findCommand(
				guild.id,
				MARK_SOLUTION_COMMAND,
				3,
			);

			yield* selfbot.invokeMessageContextMenu(
				guild.id,
				thread.id,
				threadMessage.id,
				command,
			);

			console.log("Command invoked, waiting for bot response...");

			const hasReaction = yield* waitForReaction(threadMessage, "✅", {
				timeout: "15 seconds",
			}).pipe(
				Effect.map(() => true),
				Effect.catchTag("WaitTimeoutError", () => {
					console.log("❌ Bot did not add reaction within timeout");
					console.log("This could mean:");
					console.log("  - Bot is not running");
					console.log("  - Channel doesn't have mark solution enabled");
					console.log("  - Bot doesn't have permission to react");
					return Effect.succeed(false);
				}),
			);

			expect(hasReaction).toBe(true);
			console.log("✅ Bot added checkmark reaction to solution message");
		}).pipe(Effect.provide(E2ELayer)),
	{ timeout: 30000 },
);
