import type { CategoryChannel, ThreadChannel } from "discord.js-selfbot-v13";
import { Effect } from "effect";
import { disposeRuntime, runMain } from "../core/runtime";
import { Selfbot } from "../core/selfbot-service";

const GUILD_NAME = "AO Integration";

const wipeServer = Effect.gen(function* () {
	const selfbot = yield* Selfbot;

	console.log("🗑️  Wiping E2E Test Server\n");
	console.log("=".repeat(50));

	yield* selfbot.client.login();
	const guild = yield* selfbot.getGuild(GUILD_NAME);

	console.log(`\n📍 Server: ${guild.name} (${guild.id})\n`);

	const allChannels = Array.from(guild.channels.cache.values());

	const threads = allChannels.filter(
		(c): c is ThreadChannel => "isThread" in c && c.isThread(),
	);
	for (const thread of threads) {
		yield* selfbot
			.deleteChannel(thread)
			.pipe(
				Effect.catchAll((e) =>
					Effect.sync(() =>
						console.log(`  Failed to delete thread ${thread.name}: ${e}`),
					),
				),
			);
	}

	const regularChannels = allChannels.filter(
		(c) =>
			"type" in c &&
			c.type !== "GUILD_CATEGORY" &&
			!("isThread" in c && c.isThread()),
	);
	for (const channel of regularChannels) {
		yield* selfbot
			.deleteChannel(channel)
			.pipe(
				Effect.catchAll((e) =>
					Effect.sync(() =>
						console.log(`  Failed to delete channel ${channel.name}: ${e}`),
					),
				),
			);
	}

	const categories = allChannels.filter(
		(c): c is CategoryChannel => "type" in c && c.type === "GUILD_CATEGORY",
	);
	for (const category of categories) {
		yield* selfbot
			.deleteChannel(category)
			.pipe(
				Effect.catchAll((e) =>
					Effect.sync(() =>
						console.log(`  Failed to delete category ${category.name}: ${e}`),
					),
				),
			);
	}

	console.log("\n" + "=".repeat(50));
	console.log("✅ Server wiped!");
	console.log("=".repeat(50) + "\n");

	yield* selfbot.client.destroy();
});

runMain(wipeServer)
	.then(() => disposeRuntime())
	.catch((err) => {
		console.error("❌ Wipe failed:", err);
		process.exit(1);
	});
