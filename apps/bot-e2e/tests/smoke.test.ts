import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { CHANNELS, E2ELayer, GUILD_NAME, Selfbot } from "../src/core";

const MARK_SOLUTION_COMMAND = "✅ Mark Solution";

it.scopedLive(
	"can send message and create thread",
	() =>
		Effect.gen(function* () {
			const selfbot = yield* Selfbot;

			yield* selfbot.client.login();
			const guild = yield* selfbot.getGuild(GUILD_NAME);
			const channel = yield* selfbot.getTextChannel(guild, CHANNELS.PLAYGROUND);

			const timestamp = new Date().toISOString();

			const message = yield* selfbot.sendMessage(
				channel,
				`Smoke test - ${timestamp}`,
			);
			expect(message.id).toBeDefined();
			expect(message.content).toContain("Smoke test");

			const thread = yield* selfbot.createThread(
				message,
				`Smoke Thread ${timestamp}`,
			);
			expect(thread.id).toBeDefined();
			expect(thread.name).toContain("Smoke Thread");

			const threadMessage = yield* selfbot.sendMessage(
				thread,
				"Reply in thread",
			);
			expect(threadMessage.id).toBeDefined();

			console.log("✅ Basic Discord operations work");
		}).pipe(Effect.provide(E2ELayer)),
	{ timeout: 30000 },
);

it.scopedLive(
	"can find bot commands",
	() =>
		Effect.gen(function* () {
			const selfbot = yield* Selfbot;

			yield* selfbot.client.login();
			const guild = yield* selfbot.getGuild(GUILD_NAME);

			const markSolution = yield* selfbot.findCommand(
				guild.id,
				MARK_SOLUTION_COMMAND,
				3,
			);
			expect(markSolution).toBeDefined();
			expect(markSolution.application_id).toBeDefined();

			console.log(
				`✅ Found Mark Solution command (app: ${markSolution.application_id})`,
			);
		}).pipe(Effect.provide(E2ELayer)),
	{ timeout: 30000 },
);

it.scopedLive(
	"can invoke mark solution command",
	() =>
		Effect.gen(function* () {
			const selfbot = yield* Selfbot;

			yield* selfbot.client.login();
			const guild = yield* selfbot.getGuild(GUILD_NAME);
			const channel = yield* selfbot.getTextChannel(guild, CHANNELS.PLAYGROUND);

			const timestamp = new Date().toISOString();

			const message = yield* selfbot.sendMessage(
				channel,
				`Invoke test - ${timestamp}`,
			);
			const thread = yield* selfbot.createThread(
				message,
				`Invoke Thread ${timestamp}`,
			);
			const threadMessage = yield* selfbot.sendMessage(
				thread,
				"Answer to mark",
			);

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

			console.log("✅ Mark solution command invoked successfully");
		}).pipe(Effect.provide(E2ELayer)),
	{ timeout: 30000 },
);
