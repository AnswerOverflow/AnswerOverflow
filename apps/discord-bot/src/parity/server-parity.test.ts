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
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: guild.id,
		});
		expect(serverLiveData).not.toBeNull();
		expect(serverLiveData?.discordId).toBe(guild.id);
		expect(serverLiveData?.name).toBe(guild.name);
		expect(serverLiveData?.description).toBe(guild.description);
		expect(serverLiveData?.icon).toBe(guild.icon);
		expect(serverLiveData?.approximateMemberCount).toBe(
			guild.approximateMemberCount,
		);

		// Verify server preferences were created
		if (serverLiveData?._id) {
			const preferencesLiveData =
				yield* database.server_preferences.getServerPreferencesByServerId({
					serverId: serverLiveData._id,
				});
			expect(preferencesLiveData).not.toBeNull();
			expect(preferencesLiveData?.considerAllMessagesPublicEnabled).toBe(true);
		}

		// Verify channels were synced
		if (!serverLiveData?._id) {
			throw new Error("Server ID not found");
		}
		const channelsLiveData = yield* database.channels.findAllChannelsByServerId(
			{
				serverId: serverLiveData._id,
			},
		);
		expect(channelsLiveData).not.toBeNull();
		expect(channelsLiveData?.length).toBe(2);

		// Verify text channel
		const textChannelLiveData = yield* database.channels.findChannelByDiscordId(
			{
				discordId: textChannel.id,
			},
		);
		expect(textChannelLiveData).not.toBeNull();
		expect(textChannelLiveData?.name).toBe(textChannel.name);
		expect(textChannelLiveData?.type).toBe(0); // GuildText

		// Verify forum channel
		const forumChannelLiveData =
			yield* database.channels.findChannelByDiscordId({
				discordId: forumChannel.id,
			});
		expect(forumChannelLiveData).not.toBeNull();
		expect(forumChannelLiveData?.name).toBe(forumChannel.name);
		expect(forumChannelLiveData?.type).toBe(15); // GuildForum
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

		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: guild.id,
		});
		expect(serverLiveData).not.toBeNull();
		expect(serverLiveData?.discordId).toBe(guild.id);
	}).pipe(Effect.provide(TestLayerWithParity)),
);
