import { expect, it } from "@effect/vitest";
import { Database } from "@packages/database/database";
import { DatabaseTestLayer } from "@packages/database/database-test";
import { Effect, Layer } from "effect";
import { DiscordClientMock } from "../discord-client-mock";
import { DiscordClientTestLayer } from "../discord-client-test";
import { syncGuild } from "./server-parity";

const TestLayer = Layer.mergeAll(DiscordClientTestLayer, DatabaseTestLayer);

it.scoped("guild-parity: syncs data on guild join", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const discordMock = yield* DiscordClientMock;

		// Create a mock guild
		const guild = discordMock.utilities.createMockGuild({
			id: "guild123",
			name: "Test Guild",
			description: "A test guild",
			icon: "test_icon",
			approximateMemberCount: 100,
		});

		// Seed the guild first
		discordMock.utilities.seedGuild(guild);

		// Get the guild from cache to ensure we're working with the cached instance
		const cachedGuild = discordMock.client.guilds.cache.get("guild123");
		if (!cachedGuild) {
			throw new Error("Guild not found in cache");
		}

		// Create channels using the cached guild instance - _add should add them to the guild's cache
		const textChannel = discordMock.utilities.createMockTextChannel(
			cachedGuild,
			{
				id: "channel123",
				name: "general",
			},
		);

		const forumChannel = discordMock.utilities.createMockForumChannel(
			cachedGuild,
			{
				id: "channel456",
				name: "help-forum",
			},
		);

		// Ensure channels have guild property set (Discord.js _add should set this, but verify)
		// Manually set guild property if not already set (needed for filtering in syncGuild)
		if (!("guild" in textChannel) || !textChannel.guild) {
			Object.defineProperty(textChannel, "guild", {
				value: cachedGuild,
				writable: false,
				enumerable: true,
				configurable: true,
			});
		}
		if (!("guild" in forumChannel) || !forumChannel.guild) {
			Object.defineProperty(forumChannel, "guild", {
				value: cachedGuild,
				writable: false,
				enumerable: true,
				configurable: true,
			});
		}

		// Manually ensure channels are in the guild's cache (in case _add didn't work)
		cachedGuild.channels.cache.set(textChannel.id, textChannel);
		cachedGuild.channels.cache.set(forumChannel.id, forumChannel);

		// Also seed channels in client cache (for getChannel calls)
		discordMock.utilities.seedChannel(textChannel);
		discordMock.utilities.seedChannel(forumChannel);

		// Call syncGuild directly - this tests the sync logic without relying on event timing
		// Use cachedGuild to ensure we're syncing the same instance that has channels
		yield* syncGuild(cachedGuild);

		// Verify server was created in database
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("guild123");
		expect(serverLiveData?.data).not.toBeNull();
		expect(serverLiveData?.data?.discordId).toBe("guild123");
		expect(serverLiveData?.data?.name).toBe("Test Guild");
		expect(serverLiveData?.data?.description).toBe("A test guild");
		expect(serverLiveData?.data?.icon).toBe("test_icon");
		expect(serverLiveData?.data?.approximateMemberCount).toBe(100);

		// Verify server preferences were created
		if (serverLiveData?.data?._id) {
			const preferencesLiveData =
				yield* database.serverPreferences.getServerPreferencesByServerId(
					serverLiveData.data._id,
				);
			expect(preferencesLiveData?.data).not.toBeNull();
			expect(preferencesLiveData?.data?.considerAllMessagesPublicEnabled).toBe(
				true,
			);
		}

		// Verify channels were synced
		if (!serverLiveData?.data?._id) {
			throw new Error("Server ID not found");
		}
		const channelsLiveData = yield* database.channels.findAllChannelsByServerId(
			serverLiveData.data._id,
		);
		expect(channelsLiveData?.data).not.toBeNull();
		expect(channelsLiveData?.data?.length).toBe(2);

		// Verify text channel
		const textChannelData = channelsLiveData?.data?.find(
			(ch) => ch.id === "channel123",
		);
		expect(textChannelData).not.toBeUndefined();
		expect(textChannelData?.name).toBe("general");
		expect(textChannelData?.type).toBe(0); // GuildText

		// Verify forum channel
		const forumChannelData = channelsLiveData?.data?.find(
			(ch) => ch.id === "channel456",
		);
		expect(forumChannelData).not.toBeUndefined();
		expect(forumChannelData?.name).toBe("help-forum");
		expect(forumChannelData?.type).toBe(15); // GuildForum
	}).pipe(Effect.provide(TestLayer)),
);
