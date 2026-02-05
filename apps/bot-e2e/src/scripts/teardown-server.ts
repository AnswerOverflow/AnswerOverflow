import type { CategoryChannel, ThreadChannel } from "discord.js-selfbot-v13";
import { Effect } from "effect";
import { disposeRuntime, runMain } from "../core/runtime";
import { Selfbot } from "../core/selfbot-service";

const GUILD_NAME = "AO Integration";
const CATEGORY_NAME = "E2E Test Channels";

const teardownServer = Effect.gen(function* () {
	const selfbot = yield* Selfbot;

	console.log("🧹 Starting E2E Test Server Teardown\n");
	console.log("=".repeat(50));

	yield* selfbot.client.login();
	const guild = yield* selfbot.getGuild(GUILD_NAME);

	console.log(`\n📍 Server: ${guild.name} (${guild.id})\n`);
	console.log("\n🧹 Cleaning up old test threads...");

	const oneHourAgo = Date.now() - 60 * 60 * 1000;
	let deletedCount = 0;

	const category = guild.channels.cache.find(
		(c): c is CategoryChannel =>
			c.type === "GUILD_CATEGORY" && c.name === CATEGORY_NAME,
	);

	if (!category) {
		console.log("  Category not found, skipping thread cleanup");
	} else {
		const channelsInCategory = guild.channels.cache.filter(
			(c) => "parentId" in c && c.parentId === category.id,
		);

		for (const channel of channelsInCategory.values()) {
			if (!("threads" in channel)) continue;

			const result = yield* selfbot
				.call(async () => {
					const threads = await channel.threads.fetchActive();
					return Array.from(threads.threads.values());
				})
				.pipe(
					Effect.catchAll((e) => {
						console.log(`  Failed to fetch threads for ${channel.name}: ${e}`);
						return Effect.succeed([] as ThreadChannel[]);
					}),
				);

			for (const thread of result) {
				if (thread.createdTimestamp && thread.createdTimestamp < oneHourAgo) {
					if (
						thread.name.includes("E2E") ||
						thread.name.includes("Smoke") ||
						thread.name.includes("Test")
					) {
						yield* selfbot.deleteChannel(thread).pipe(
							Effect.tap(() => {
								deletedCount++;
								return Effect.void;
							}),
							Effect.catchAll(() => Effect.void),
						);
					}
				}
			}
		}
	}

	console.log(`✅ Cleaned up ${deletedCount} old threads\n`);

	console.log("=".repeat(50));
	console.log("✅ Teardown complete!\n");

	yield* selfbot.client.destroy();
});

runMain(teardownServer)
	.then(() => disposeRuntime())
	.catch((err) => {
		console.error("❌ Teardown failed:", err);
		process.exit(1);
	});
