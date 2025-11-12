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

		// Create and seed guild
		const guild = discordMock.utilities.createMockGuild({
			id: "guild123",
			name: "Test Guild",
			description: "A test guild",
			icon: "test_icon",
			approximateMemberCount: 100,
		});
		discordMock.utilities.seedGuild(guild);

		// Create channels
		const textChannel = discordMock.utilities.createMockTextChannel(guild, {
			id: "channel123",
			name: "general",
		});
		const forumChannel = discordMock.utilities.createMockForumChannel(guild, {
			id: "channel456",
			name: "help-forum",
		});

		// Seed channels in client cache
		discordMock.utilities.seedChannel(textChannel);
		discordMock.utilities.seedChannel(forumChannel);

		// Sync guild
		yield* syncGuild(guild);

		// Verify server was created
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
