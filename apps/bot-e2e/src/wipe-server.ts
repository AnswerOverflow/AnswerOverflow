import type { CategoryChannel, ThreadChannel } from "discord.js-selfbot-v13";
import { cleanup, getClient } from "./client";

const GUILD_NAME = "AO Integration";

async function wipeServer(): Promise<void> {
	console.log("🗑️  Wiping E2E Test Server\n");
	console.log("=".repeat(50));

	const client = await getClient();
	const guild = client.guilds.cache.find((g) => g.name === GUILD_NAME);

	if (!guild) {
		const available = client.guilds.cache.map((g) => g.name).join(", ");
		throw new Error(`Guild "${GUILD_NAME}" not found. Available: ${available}`);
	}

	console.log(`\n📍 Server: ${guild.name} (${guild.id})\n`);

	const allChannels = Array.from(guild.channels.cache.values());

	const threads = allChannels.filter(
		(c): c is ThreadChannel => "isThread" in c && c.isThread(),
	);
	for (const thread of threads) {
		try {
			await thread.delete();
			console.log(`  Deleted thread: ${thread.name}`);
		} catch (err) {
			console.log(`  Failed to delete thread ${thread.name}: ${err}`);
		}
	}

	const regularChannels = allChannels.filter(
		(c) =>
			"type" in c &&
			c.type !== "GUILD_CATEGORY" &&
			!("isThread" in c && c.isThread()),
	);
	for (const channel of regularChannels) {
		try {
			await channel.delete();
			console.log(`  Deleted channel: ${channel.name}`);
		} catch (err) {
			console.log(`  Failed to delete channel ${channel.name}: ${err}`);
		}
	}

	const categories = allChannels.filter(
		(c): c is CategoryChannel => "type" in c && c.type === "GUILD_CATEGORY",
	);
	for (const category of categories) {
		try {
			await category.delete();
			console.log(`  Deleted category: ${category.name}`);
		} catch (err) {
			console.log(`  Failed to delete category ${category.name}: ${err}`);
		}
	}

	console.log("\n" + "=".repeat(50));
	console.log("✅ Server wiped!");
	console.log("=".repeat(50) + "\n");

	await cleanup();
}

wipeServer().catch((err) => {
	console.error("❌ Wipe failed:", err);
	process.exit(1);
});
