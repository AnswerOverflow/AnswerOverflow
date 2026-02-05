import type {
	CategoryChannel,
	Guild,
	ThreadChannel,
} from "discord.js-selfbot-v13";
import { cleanup, getClient } from "./client";

const GUILD_NAME = "AO Integration";
const CATEGORY_NAME = "E2E Test Channels";

async function deleteOldThreads(guild: Guild): Promise<void> {
	console.log("\n🧹 Cleaning up old test threads...");

	const oneHourAgo = Date.now() - 60 * 60 * 1000;
	let deletedCount = 0;

	const category = guild.channels.cache.find(
		(c): c is CategoryChannel =>
			c.type === "GUILD_CATEGORY" && c.name === CATEGORY_NAME,
	);

	if (!category) {
		console.log("  Category not found, skipping thread cleanup");
		return;
	}

	const channelsInCategory = guild.channels.cache.filter(
		(c) => "parentId" in c && c.parentId === category.id,
	);

	for (const channel of channelsInCategory.values()) {
		if (!("threads" in channel)) continue;

		try {
			const threads = await channel.threads.fetchActive();
			for (const thread of threads.threads.values()) {
				if (thread.createdTimestamp && thread.createdTimestamp < oneHourAgo) {
					if (
						thread.name.includes("E2E") ||
						thread.name.includes("Smoke") ||
						thread.name.includes("Test")
					) {
						await thread.delete();
						deletedCount++;
						console.log(`  Deleted old thread: ${thread.name}`);
					}
				}
			}
		} catch (err) {
			console.log(`  Failed to fetch threads for ${channel.name}: ${err}`);
		}
	}

	console.log(`✅ Cleaned up ${deletedCount} old threads\n`);
}

async function teardownServer(): Promise<void> {
	console.log("🧹 Starting E2E Test Server Teardown\n");
	console.log("=".repeat(50));

	const client = await getClient();
	const guild = client.guilds.cache.find((g) => g.name === GUILD_NAME);

	if (!guild) {
		const available = client.guilds.cache.map((g) => g.name).join(", ");
		throw new Error(`Guild "${GUILD_NAME}" not found. Available: ${available}`);
	}

	console.log(`\n📍 Server: ${guild.name} (${guild.id})\n`);

	await deleteOldThreads(guild);

	console.log("=".repeat(50));
	console.log("✅ Teardown complete!\n");

	await cleanup();
}

teardownServer().catch((err) => {
	console.error("❌ Teardown failed:", err);
	process.exit(1);
});
