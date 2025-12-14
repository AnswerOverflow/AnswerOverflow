import { expect, it } from "@effect/vitest";
import { Database } from "@packages/database/database";
import { Effect, Layer } from "effect";
import { DiscordClientMock } from "../core/discord-client-mock";
import { Discord } from "../core/discord-service";
import { TestLayer } from "../core/layers";
import { ServerParityLayer, syncGuild } from "./server";

const TestLayerWithParity = Layer.mergeAll(
	TestLayer,
	ServerParityLayer.pipe(Layer.provide(TestLayer)),
);

it.scoped("guild-parity: syncs data on guild join", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const discordMock = yield* DiscordClientMock;

		const guild = discordMock.utilities.createMockGuild({
			description: "A test guild",
			icon: "test_icon",
		});
		discordMock.utilities.seedGuild(guild);

		const textChannel = discordMock.utilities.createMockTextChannel(guild);
		const forumChannel = discordMock.utilities.createMockForumChannel(guild);

		discordMock.utilities.seedChannel(textChannel);
		discordMock.utilities.seedChannel(forumChannel);

		yield* syncGuild(guild);

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(guild.id),
			},
		);
		expect(serverLiveData).not.toBeNull();
		expect(serverLiveData?.discordId).toBe(BigInt(guild.id));
		expect(serverLiveData?.name).toBe(guild.name);
		expect(serverLiveData?.description).toBe(guild.description);
		expect(serverLiveData?.icon).toBe(guild.icon);
		expect(serverLiveData?.approximateMemberCount).toBe(
			guild.approximateMemberCount,
		);

		if (serverLiveData?.discordId) {
			const preferencesLiveData =
				yield* database.private.server_preferences.getServerPreferencesByServerId(
					{
						serverId: serverLiveData.discordId,
					},
				);
			expect(preferencesLiveData).not.toBeNull();
			expect(preferencesLiveData?.considerAllMessagesPublicEnabled).toBe(true);
		}

		if (!serverLiveData?.discordId) {
			throw new Error("Server ID not found");
		}
		const channelsLiveData =
			yield* database.private.channels.findAllChannelsByServerId({
				serverId: serverLiveData.discordId,
			});
		expect(channelsLiveData).not.toBeNull();
		expect(channelsLiveData?.length).toBe(2);

		const textChannelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(textChannel.id),
			});
		expect(textChannelLiveData).not.toBeNull();
		expect(textChannelLiveData?.name).toBe(textChannel.name);
		expect(textChannelLiveData?.type).toBe(0); // GuildText

		const forumChannelLiveData =
			yield* database.private.channels.findChannelByDiscordId({
				discordId: BigInt(forumChannel.id),
			});
		expect(forumChannelLiveData).not.toBeNull();
		expect(forumChannelLiveData?.name).toBe(forumChannel.name);
		expect(forumChannelLiveData?.type).toBe(15); // GuildForum
	}).pipe(Effect.provide(TestLayer)),
);

it.scoped("guild-parity: runs first on guildCreate", () =>
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

		const serverLiveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: BigInt(guild.id),
			},
		);
		expect(serverLiveData).not.toBeNull();
		expect(serverLiveData?.discordId).toBe(BigInt(guild.id));
	}).pipe(Effect.provide(TestLayerWithParity)),
);
