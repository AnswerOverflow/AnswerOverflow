import { expect, it } from "@effect/vitest";
import { Database } from "@packages/database/database";
import {
	Collection,
	PermissionFlagsBits,
	PermissionsBitField,
	type TextChannel,
} from "discord.js";
import { Effect, Exit, Fiber } from "effect";
import { DiscordClientMock } from "../core/discord-client-mock";
import { TestLayer } from "../core/layers";
import {
	guildsBeingIndexed,
	runCatchUpIndexing,
	runIndexingCore,
	runIndexingForGuild,
} from "./indexing";

const seedDbChannel = (
	channel: TextChannel,
	settings: { indexingEnabled: boolean; lastIndexedSnowflake?: bigint },
) =>
	Effect.gen(function* () {
		const database = yield* Database;
		yield* database.private.channels.upsertChannel({
			channel: {
				id: BigInt(channel.id),
				serverId: BigInt(channel.guild.id),
				name: channel.name,
				type: channel.type,
			},
		});
		yield* database.private.channels.updateChannelSettings({
			channelId: BigInt(channel.id),
			settings,
		});
	});

// The mock client has no logged-in user, so the real permissionsFor returns
// null and every channel gets skipped. Grant exactly the permissions indexing
// needs (no CreateInstantInvite, so ensureInviteCode falls back to the guild
// vanity code - the observable marker that a channel was actually indexed) and
// make message fetches return nothing.
const makeChannelIndexable = (channel: TextChannel) => {
	const permissions = new PermissionsBitField([
		PermissionFlagsBits.ViewChannel,
		PermissionFlagsBits.ReadMessageHistory,
	]);
	Object.defineProperty(channel, "permissionsFor", {
		value: () => permissions,
	});
	Object.defineProperty(channel.messages, "fetch", {
		value: async () => new Collection(),
	});
};

const poisonGuildChannelCache = (guild: TextChannel["guild"]) => {
	Object.defineProperty(guild.channels, "cache", {
		get() {
			throw new Error("poisoned channel cache");
		},
	});
};

it.scoped(
	"findServerIdsWithUnindexedChannels returns only servers with never-indexed enabled channels",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const neverIndexedGuild = discordMock.utilities.createMockGuild({
				id: "100000000000000001",
			});
			const alreadyIndexedGuild = discordMock.utilities.createMockGuild({
				id: "100000000000000003",
			});
			const disabledGuild = discordMock.utilities.createMockGuild({
				id: "100000000000000005",
			});

			yield* seedDbChannel(
				discordMock.utilities.createMockTextChannel(neverIndexedGuild, {
					id: "100000000000000002",
				}),
				{ indexingEnabled: true },
			);
			yield* seedDbChannel(
				discordMock.utilities.createMockTextChannel(alreadyIndexedGuild, {
					id: "100000000000000004",
				}),
				{ indexingEnabled: true, lastIndexedSnowflake: 123n },
			);
			yield* seedDbChannel(
				discordMock.utilities.createMockTextChannel(disabledGuild, {
					id: "100000000000000006",
				}),
				{ indexingEnabled: false },
			);

			const serverIds =
				yield* database.private.channels.findServerIdsWithUnindexedChannels();

			expect(serverIds).toContainEqual(BigInt(neverIndexedGuild.id));
			expect(serverIds).not.toContainEqual(BigInt(alreadyIndexedGuild.id));
			expect(serverIds).not.toContainEqual(BigInt(disabledGuild.id));
		}).pipe(Effect.provide(TestLayer)),
);

it.scopedLive(
	"catch-up run backfills never-indexed guilds and skips servers the bot is not in",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild({
				id: "200000000000000001",
				vanityURLCode: "test-vanity",
			});
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild, {
				id: "200000000000000002",
			});
			discordMock.utilities.seedChannel(channel);
			makeChannelIndexable(channel);
			yield* seedDbChannel(channel, { indexingEnabled: true });

			// A server that exists only in the database - sorts before the real
			// guild, so the run must skip it without failing.
			yield* database.private.channels.upsertChannel({
				channel: {
					id: 100000000000000009n,
					serverId: 100000000000000008n,
					name: "bot-was-kicked-channel",
					type: 0,
				},
			});
			yield* database.private.channels.updateChannelSettings({
				channelId: 100000000000000009n,
				settings: { indexingEnabled: true },
			});

			const lastSuccessAtMs = new Map<string, number>();
			yield* runCatchUpIndexing(lastSuccessAtMs);

			const liveChannel =
				yield* database.private.channels.findChannelByDiscordId({
					discordId: BigInt(channel.id),
				});
			expect(liveChannel?.flags.inviteCode).toBe("test-vanity");
			// The 6h cooldown is only recorded for the guild that completed.
			expect(lastSuccessAtMs.has(guild.id)).toBe(true);
			expect(lastSuccessAtMs.size).toBe(1);
		}).pipe(Effect.provide(TestLayer)),
);

it.scopedLive(
	"catch-up run continues past a guild whose channel cache throws",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const poisonedGuild = discordMock.utilities.createMockGuild({
				id: "300000000000000001",
			});
			discordMock.utilities.seedGuild(poisonedGuild);
			const poisonedChannel = discordMock.utilities.createMockTextChannel(
				poisonedGuild,
				{ id: "300000000000000002" },
			);
			discordMock.utilities.seedChannel(poisonedChannel);
			yield* seedDbChannel(poisonedChannel, { indexingEnabled: true });

			// Sorts after the poisoned guild, so it is only reached if the walk
			// survives the defect.
			const healthyGuild = discordMock.utilities.createMockGuild({
				id: "300000000000000003",
				vanityURLCode: "healthy-vanity",
			});
			discordMock.utilities.seedGuild(healthyGuild);
			const healthyChannel = discordMock.utilities.createMockTextChannel(
				healthyGuild,
				{ id: "300000000000000004" },
			);
			discordMock.utilities.seedChannel(healthyChannel);
			makeChannelIndexable(healthyChannel);
			yield* seedDbChannel(healthyChannel, { indexingEnabled: true });

			poisonGuildChannelCache(poisonedGuild);

			const lastSuccessAtMs = new Map<string, number>();
			yield* runCatchUpIndexing(lastSuccessAtMs);

			const liveChannel =
				yield* database.private.channels.findChannelByDiscordId({
					discordId: BigInt(healthyChannel.id),
				});
			expect(liveChannel?.flags.inviteCode).toBe("healthy-vanity");
			// The failed guild gets no cooldown, so the next tick retries it.
			expect(lastSuccessAtMs.has(poisonedGuild.id)).toBe(false);
			expect(lastSuccessAtMs.has(healthyGuild.id)).toBe(true);
		}).pipe(Effect.provide(TestLayer)),
);

it.scopedLive("runIndexingCore continues past a guild that dies", () =>
	Effect.gen(function* () {
		const database = yield* Database;
		const discordMock = yield* DiscordClientMock;

		const poisonedGuild = discordMock.utilities.createMockGuild({
			id: "400000000000000001",
		});
		discordMock.utilities.seedGuild(poisonedGuild);
		const poisonedChannel = discordMock.utilities.createMockTextChannel(
			poisonedGuild,
			{ id: "400000000000000002" },
		);
		discordMock.utilities.seedChannel(poisonedChannel);
		yield* seedDbChannel(poisonedChannel, { indexingEnabled: true });

		const healthyGuild = discordMock.utilities.createMockGuild({
			id: "400000000000000003",
			vanityURLCode: "core-vanity",
		});
		discordMock.utilities.seedGuild(healthyGuild);
		const healthyChannel = discordMock.utilities.createMockTextChannel(
			healthyGuild,
			{ id: "400000000000000004" },
		);
		discordMock.utilities.seedChannel(healthyChannel);
		makeChannelIndexable(healthyChannel);
		yield* seedDbChannel(healthyChannel, { indexingEnabled: true });

		poisonGuildChannelCache(poisonedGuild);

		yield* runIndexingCore();

		const liveChannel = yield* database.private.channels.findChannelByDiscordId(
			{
				discordId: BigInt(healthyChannel.id),
			},
		);
		expect(liveChannel?.flags.inviteCode).toBe("core-vanity");
	}).pipe(Effect.provide(TestLayer)),
);

it.scopedLive(
	"catch-up skips a guild that another run is already indexing",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild({
				id: "500000000000000001",
				vanityURLCode: "busy-vanity",
			});
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild, {
				id: "500000000000000002",
			});
			discordMock.utilities.seedChannel(channel);
			makeChannelIndexable(channel);
			yield* seedDbChannel(channel, { indexingEnabled: true });

			guildsBeingIndexed.add(guild.id);
			const lastSuccessAtMs = new Map<string, number>();
			yield* runCatchUpIndexing(lastSuccessAtMs).pipe(
				Effect.ensuring(Effect.sync(() => guildsBeingIndexed.delete(guild.id))),
			);

			// The guild was left untouched and got no cooldown, so the next tick
			// picks it up once the other run releases the slot.
			const liveChannel =
				yield* database.private.channels.findChannelByDiscordId({
					discordId: BigInt(channel.id),
				});
			expect(liveChannel?.flags.inviteCode).toBeUndefined();
			expect(lastSuccessAtMs.has(guild.id)).toBe(false);
		}).pipe(Effect.provide(TestLayer)),
);

it.scopedLive(
	"runIndexingForGuild reports skipped when the guild is already in-flight",
	() =>
		Effect.gen(function* () {
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild({
				id: "600000000000000001",
			});
			discordMock.utilities.seedGuild(guild);

			guildsBeingIndexed.add(guild.id);
			const status = yield* runIndexingForGuild(guild).pipe(
				Effect.ensuring(Effect.sync(() => guildsBeingIndexed.delete(guild.id))),
			);
			expect(status).toBe("skipped");
		}).pipe(Effect.provide(TestLayer)),
);

it.scopedLive(
	"interrupting a catch-up run is not swallowed and records no cooldown",
	() =>
		Effect.gen(function* () {
			const discordMock = yield* DiscordClientMock;

			const guild = discordMock.utilities.createMockGuild({
				id: "700000000000000001",
			});
			discordMock.utilities.seedGuild(guild);
			const channel = discordMock.utilities.createMockTextChannel(guild, {
				id: "700000000000000002",
			});
			discordMock.utilities.seedChannel(channel);

			const permissions = new PermissionsBitField([
				PermissionFlagsBits.ViewChannel,
				PermissionFlagsBits.ReadMessageHistory,
			]);
			Object.defineProperty(channel, "permissionsFor", {
				value: () => permissions,
			});
			// Hang the message fetch so the run is mid-guild when interrupted.
			let fetchStarted = false;
			Object.defineProperty(channel.messages, "fetch", {
				value: () => {
					fetchStarted = true;
					return new Promise(() => {});
				},
			});
			yield* seedDbChannel(channel, { indexingEnabled: true });

			const lastSuccessAtMs = new Map<string, number>();
			const fiber = yield* Effect.fork(runCatchUpIndexing(lastSuccessAtMs));

			let waited = 0;
			while (!fetchStarted && waited < 500) {
				yield* Effect.sleep("10 millis");
				waited++;
			}
			expect(fetchStarted).toBe(true);

			const exit = yield* Fiber.interrupt(fiber);

			expect(Exit.isInterrupted(exit)).toBe(true);
			expect(lastSuccessAtMs.size).toBe(0);
			// The in-flight slot must be released on interruption.
			expect(guildsBeingIndexed.has(guild.id)).toBe(false);
		}).pipe(Effect.provide(TestLayer)),
);
