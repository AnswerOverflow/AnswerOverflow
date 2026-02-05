import { Database } from "@packages/database/database";
import {
	type CategoryChannel,
	Constants,
	type ForumChannel,
	type Guild,
	type TextChannel,
	type ThreadChannel,
} from "discord.js-selfbot-v13";
import { Array as Arr, Effect } from "effect";
import { disposeRuntime, runMain } from "../core/runtime";
import { Selfbot } from "../core/selfbot-service";

const GUILD_NAME = "AO Integration";
const CATEGORY_NAME = "E2E Test Channels";

type ChannelConfig = {
	name: string;
	type: "GUILD_TEXT" | "GUILD_FORUM";
	discordType:
		| typeof Constants.ChannelTypes.GUILD_TEXT
		| typeof Constants.ChannelTypes.GUILD_FORUM;
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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
		discordType: Constants.ChannelTypes.GUILD_FORUM,
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
		discordType: Constants.ChannelTypes.GUILD_FORUM,
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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
		discordType: Constants.ChannelTypes.GUILD_TEXT,
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

type CreatedChannel = {
	name: string;
	id: string;
	config: ChannelConfig;
};

const deleteAllChannelsAndCategories = (guild: Guild) =>
	Effect.gen(function* () {
		const selfbot = yield* Selfbot;
		console.log("\n🗑️  Deleting all existing channels and categories...");

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

		console.log("✅ All channels deleted\n");
	});

const setupDiscordChannels = Effect.gen(function* () {
	const selfbot = yield* Selfbot;

	console.log("🚀 Starting E2E Test Server Setup\n");
	console.log("=".repeat(50));

	yield* selfbot.client.login();
	const guild = yield* selfbot.getGuild(GUILD_NAME);

	console.log(`\n📍 Server: ${guild.name} (${guild.id})\n`);

	yield* deleteAllChannelsAndCategories(guild);

	const category = yield* selfbot.createCategory(guild, CATEGORY_NAME);

	console.log("\n📦 Creating test channels...\n");

	const createdChannels: Array<CreatedChannel> = [];

	for (const channelConfig of CHANNELS_TO_CREATE) {
		if (channelConfig.type === "GUILD_TEXT") {
			const channel = yield* selfbot.createTextChannelInCategory(
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
			const channel = yield* selfbot.createForumChannel(
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
});

const configureConvexChannels = (
	serverId: string,
	categoryId: string,
	channels: Array<CreatedChannel>,
) =>
	Effect.gen(function* () {
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

const setupServer = Effect.gen(function* () {
	const selfbot = yield* Selfbot;
	const { serverId, categoryId, channels } = yield* setupDiscordChannels;

	yield* configureConvexChannels(serverId, categoryId, channels);

	console.log("\n" + "=".repeat(50));
	console.log("✅ Server setup complete!");
	console.log("=".repeat(50) + "\n");

	yield* selfbot.client.destroy();
});

runMain(setupServer)
	.then(() => disposeRuntime())
	.catch((err) => {
		console.error("❌ Setup failed:", err);
		process.exit(1);
	});
