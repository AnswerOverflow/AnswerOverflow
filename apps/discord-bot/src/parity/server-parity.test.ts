import { expect, it } from "@effect/vitest";
import { Database } from "@packages/database/database";
import { DatabaseTestLayer } from "@packages/database/database-test";
import { Effect, Layer } from "effect";
import { DiscordClientMock } from "../core/discord-client-mock";
import { DiscordClientTestLayer } from "../core/discord-client-test-layer";
import { Discord } from "../core/discord-service";
import { ServerParityLayer, syncGuild } from "./server-parity";

const TestLayer = Layer.mergeAll(DiscordClientTestLayer, DatabaseTestLayer);

const TestLayerWithParity = Layer.mergeAll(
	TestLayer,
	ServerParityLayer.pipe(Layer.provide(TestLayer)),
);

it.scoped("guild-parity: syncs data on guild join", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const discordMock = yield* DiscordClientMock;

		// Create and seed guild
		const guild = discordMock.utilities.createMockGuild({
			description: "A test guild",
			icon: "test_icon",
		});
		discordMock.utilities.seedGuild(guild);

		// Create channels
		const textChannel = discordMock.utilities.createMockTextChannel(guild);
		const forumChannel = discordMock.utilities.createMockForumChannel(guild);

		// Seed channels in client cache
		discordMock.utilities.seedChannel(textChannel);
		discordMock.utilities.seedChannel(forumChannel);

		// Sync guild
		yield* syncGuild(guild);

		// Verify server was created
		const serverLiveData = yield* database.servers.getServerByDiscordId(
			guild.id,
		);
		expect(serverLiveData?.data).not.toBeNull();
		expect(serverLiveData?.data?.discordId).toBe(guild.id);
		expect(serverLiveData?.data?.name).toBe(guild.name);
		expect(serverLiveData?.data?.description).toBe(guild.description);
		expect(serverLiveData?.data?.icon).toBe(guild.icon);
		expect(serverLiveData?.data?.approximateMemberCount).toBe(
			guild.approximateMemberCount,
		);

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
		const textChannelLiveData = yield* database.channels.findChannelByDiscordId(
			textChannel.id,
		);
		expect(textChannelLiveData?.data).not.toBeNull();
		expect(textChannelLiveData?.data?.name).toBe(textChannel.name);
		expect(textChannelLiveData?.data?.type).toBe(0); // GuildText

		// Verify forum channel
		const forumChannelLiveData =
			yield* database.channels.findChannelByDiscordId(forumChannel.id);
		expect(forumChannelLiveData?.data).not.toBeNull();
		expect(forumChannelLiveData?.data?.name).toBe(forumChannel.name);
		expect(forumChannelLiveData?.data?.type).toBe(15); // GuildForum
	}).pipe(Effect.provide(TestLayer)),
);

it.scoped.only("guild-parity: runs first on guildCreate", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const discordMock = yield* DiscordClientMock;
		const discord = yield* Discord;

		const guild = discordMock.utilities.createMockGuild({
			description: "A test guild",
			icon: "test_icon",
		});

		discordMock.utilities.seedGuild(guild);

		const textChannel = discordMock.utilities.createMockTextChannel(guild);
		const forumChannel = discordMock.utilities.createMockForumChannel(guild);

		discordMock.utilities.seedChannel(textChannel);
		discordMock.utilities.seedChannel(forumChannel);

		discordMock.utilities.emitGuildCreate(guild);

		yield* discord.client.waitForHandlers("guildCreate");

		const serverLiveData = yield* database.servers.getServerByDiscordId(
			guild.id,
		);
		expect(serverLiveData?.data).not.toBeNull();
		expect(serverLiveData?.data?.discordId).toBe(guild.id);
	}).pipe(Effect.provide(TestLayerWithParity)),
);
