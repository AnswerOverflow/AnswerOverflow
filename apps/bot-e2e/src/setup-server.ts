import { Database, DatabaseHttpLayer } from "@packages/database/database";
import type {
	CategoryChannel,
	ForumChannel,
	Guild,
	TextChannel,
	ThreadChannel,
} from "discord.js-selfbot-v13";
import { Effect } from "effect";
import { cleanup, getClient } from "./client";

const GUILD_NAME = "AO Integration";
const CATEGORY_NAME = "E2E Test Channels";

type ChannelConfig = {
	name: string;
	type: "GUILD_TEXT" | "GUILD_FORUM";
	discordType: number;
	topic: string;
	settings: {
		indexingEnabled: boolean;
		markSolutionEnabled: boolean;
		sendMarkSolutionInstructionsInNewThreads: boolean;
		autoThreadEnabled: boolean;
		forumGuidelinesConsentEnabled: boolean;
	};
};

const CHANNELS_TO_CREATE: Array<ChannelConfig> = [
	{
		name: "mark-solution-enabled",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "Text channel with mark solution enabled.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: true,
			sendMarkSolutionInstructionsInNewThreads: true,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "mark-solution-disabled",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "Text channel with mark solution disabled.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: false,
			sendMarkSolutionInstructionsInNewThreads: false,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "auto-thread-enabled",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "Text channel with auto-thread enabled.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: true,
			sendMarkSolutionInstructionsInNewThreads: true,
			autoThreadEnabled: true,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "forum-mark-solution",
		type: "GUILD_FORUM",
		discordType: 15,
		topic: "Forum channel with mark solution enabled.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: true,
			sendMarkSolutionInstructionsInNewThreads: true,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "forum-no-settings",
		type: "GUILD_FORUM",
		discordType: 15,
		topic: "Forum channel with no settings enabled.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: false,
			sendMarkSolutionInstructionsInNewThreads: false,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "read-the-rules",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "Channel for testing read-the-rules feature.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: false,
			sendMarkSolutionInstructionsInNewThreads: false,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: true,
		},
	},
	{
		name: "ai-auto-answer",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "Channel for testing AI auto-answer feature.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: true,
			sendMarkSolutionInstructionsInNewThreads: true,
			autoThreadEnabled: true,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "indexing-enabled",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "Channel where indexing is enabled.",
		settings: {
			indexingEnabled: true,
			markSolutionEnabled: false,
			sendMarkSolutionInstructionsInNewThreads: false,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "indexing-disabled",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "Channel where indexing is explicitly disabled.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: false,
			sendMarkSolutionInstructionsInNewThreads: false,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
		},
	},
	{
		name: "playground",
		type: "GUILD_TEXT",
		discordType: 0,
		topic: "General playground for ad-hoc testing.",
		settings: {
			indexingEnabled: false,
			markSolutionEnabled: false,
			sendMarkSolutionInstructionsInNewThreads: false,
			autoThreadEnabled: false,
			forumGuidelinesConsentEnabled: false,
		},
	},
];

async function deleteAllChannelsAndCategories(guild: Guild): Promise<void> {
	console.log("\n🗑️  Deleting all existing channels and categories...");

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

	console.log("✅ All channels deleted\n");
}

async function createCategory(
	guild: Guild,
	name: string,
): Promise<CategoryChannel> {
	console.log(`📁 Creating category: ${name}`);
	const category = (await guild.channels.create(name, {
		type: "GUILD_CATEGORY",
	})) as CategoryChannel;
	return category;
}

async function createTextChannel(
	guild: Guild,
	name: string,
	topic: string,
	category: CategoryChannel,
): Promise<TextChannel> {
	console.log(`  📝 Creating text channel: #${name}`);
	const channel = (await guild.channels.create(name, {
		type: "GUILD_TEXT",
		topic,
		parent: category.id,
	})) as TextChannel;
	return channel;
}

async function createForumChannel(
	guild: Guild,
	name: string,
	topic: string,
	category: CategoryChannel,
): Promise<ForumChannel> {
	console.log(`  💬 Creating forum channel: #${name}`);
	const channel = (await guild.channels.create(name, {
		type: "GUILD_FORUM",
		topic,
		parent: category.id,
	})) as ForumChannel;
	return channel;
}

type CreatedChannel = {
	name: string;
	id: string;
	config: ChannelConfig;
};

async function setupDiscordChannels(): Promise<{
	serverId: string;
	categoryId: string;
	channels: Array<CreatedChannel>;
}> {
	console.log("🚀 Starting E2E Test Server Setup\n");
	console.log("=".repeat(50));

	const client = await getClient();
	const guild = client.guilds.cache.find((g) => g.name === GUILD_NAME);

	if (!guild) {
		const available = client.guilds.cache.map((g) => g.name).join(", ");
		throw new Error(`Guild "${GUILD_NAME}" not found. Available: ${available}`);
	}

	console.log(`\n📍 Server: ${guild.name} (${guild.id})\n`);

	await deleteAllChannelsAndCategories(guild);

	const category = await createCategory(guild, CATEGORY_NAME);

	console.log("\n📦 Creating test channels...\n");

	const createdChannels: Array<CreatedChannel> = [];

	for (const channelConfig of CHANNELS_TO_CREATE) {
		if (channelConfig.type === "GUILD_TEXT") {
			const channel = await createTextChannel(
				guild,
				channelConfig.name,
				channelConfig.topic,
				category,
			);
			createdChannels.push({
				name: channel.name,
				id: channel.id,
				config: channelConfig,
			});
		} else if (channelConfig.type === "GUILD_FORUM") {
			const channel = await createForumChannel(
				guild,
				channelConfig.name,
				channelConfig.topic,
				category,
			);
			createdChannels.push({
				name: channel.name,
				id: channel.id,
				config: channelConfig,
			});
		}
	}

	console.log("\n✅ Discord channels created!\n");

	for (const channel of createdChannels) {
		console.log(`  #${channel.name} (${channel.id})`);
	}

	return {
		serverId: guild.id,
		categoryId: category.id,
		channels: createdChannels,
	};
}

function configureConvexChannels(
	serverId: string,
	categoryId: string,
	channels: Array<CreatedChannel>,
) {
	return Effect.gen(function* () {
		console.log("\n🔧 Configuring channels in Convex...\n");

		const db = yield* Database;

		for (const channel of channels) {
			console.log(`  📝 Configuring #${channel.name}...`);

			yield* db.private.channels.upsertChannel({
				channel: {
					id: BigInt(channel.id),
					serverId: BigInt(serverId),
					name: channel.name,
					type: channel.config.discordType,
					parentId: BigInt(categoryId),
				},
			});

			yield* db.private.channels.updateChannelSettings({
				channelId: BigInt(channel.id),
				settings: {
					channelId: BigInt(channel.id),
					serverId: BigInt(serverId),
					...channel.config.settings,
				},
			});

			console.log(`     ✅ Done`);
		}

		console.log("\n✅ Convex configuration complete!");
	});
}

async function setupServer(): Promise<void> {
	const { serverId, categoryId, channels } = await setupDiscordChannels();

	const program = configureConvexChannels(serverId, categoryId, channels).pipe(
		Effect.provide(DatabaseHttpLayer),
	);

	await Effect.runPromise(program);

	console.log("\n" + "=".repeat(50));
	console.log("✅ Server setup complete!");
	console.log("=".repeat(50) + "\n");

	await cleanup();
}

setupServer().catch((err) => {
	console.error("❌ Setup failed:", err);
	process.exit(1);
});
