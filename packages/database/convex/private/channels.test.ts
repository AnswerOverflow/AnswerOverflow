import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import { createChannel, createServer } from "../../src/test";

describe("channels", () => {
	describe("upsertChannel", () => {
		it.scoped("should create a new channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channelId = BigInt(Date.now());

				yield* database.private.channels.upsertChannel({
					channel: {
						id: channelId,
						serverId: server.discordId,
						name: "general",
						type: 0,
					},
				});

				const channel = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: channelId },
					{ subscribe: false },
				);
				expect(channel).not.toBeNull();
				expect(channel?.name).toBe("general");
				expect(channel?.type).toBe(0);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should update an existing channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId, {
					name: "original",
				});

				yield* database.private.channels.upsertChannel({
					channel: {
						id: channel.id,
						serverId: server.discordId,
						name: "updated",
						type: channel.type,
					},
				});

				const updated = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: channel.id },
					{ subscribe: false },
				);
				expect(updated?.name).toBe("updated");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should store parent channel id for threads", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const parentChannel = yield* createChannel(server.discordId, {
					type: 0,
				});
				const threadId = BigInt(Date.now());

				yield* database.private.channels.upsertChannel({
					channel: {
						id: threadId,
						serverId: server.discordId,
						name: "help-thread",
						type: 11,
						parentId: parentChannel.id,
					},
				});

				const thread = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: threadId },
					{ subscribe: false },
				);
				expect(thread?.parentId).toBe(parentChannel.id);
				expect(thread?.type).toBe(11);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findChannelByDiscordId", () => {
		it.scoped("should return null for non-existent channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: nonExistentId },
					{ subscribe: false },
				);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return channel with default settings", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);

				const result = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: channel.id },
					{ subscribe: false },
				);

				expect(result).not.toBeNull();
				expect(result?.flags).toBeDefined();
				expect(result?.flags.indexingEnabled).toBe(false);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findAllChannelsByServerId", () => {
		it.scoped("should return all channels for a server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				yield* createChannel(server.discordId, { name: "general", type: 0 });
				yield* createChannel(server.discordId, { name: "help", type: 0 });
				yield* createChannel(server.discordId, {
					name: "announcements",
					type: 5,
				});

				const channels =
					yield* database.private.channels.findAllChannelsByServerId(
						{ serverId: server.discordId },
						{ subscribe: false },
					);

				expect(channels.length).toBeGreaterThanOrEqual(3);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for server with no channels", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();

				const channels =
					yield* database.private.channels.findAllChannelsByServerId(
						{ serverId: server.discordId },
						{ subscribe: false },
					);

				expect(channels).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("updateChannelSettings", () => {
		it.scoped("should enable indexing", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);

				yield* database.private.channels.updateChannelSettings({
					channelId: channel.id,
					settings: { indexingEnabled: true },
				});

				const updated = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: channel.id },
					{ subscribe: false },
				);
				expect(updated?.flags.indexingEnabled).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should enable mark solution", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);

				yield* database.private.channels.updateChannelSettings({
					channelId: channel.id,
					settings: { markSolutionEnabled: true },
				});

				const updated = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: channel.id },
					{ subscribe: false },
				);
				expect(updated?.flags.markSolutionEnabled).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should update multiple settings at once", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);

				yield* database.private.channels.updateChannelSettings({
					channelId: channel.id,
					settings: {
						indexingEnabled: true,
						markSolutionEnabled: true,
						autoThreadEnabled: true,
					},
				});

				const updated = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: channel.id },
					{ subscribe: false },
				);
				expect(updated?.flags.indexingEnabled).toBe(true);
				expect(updated?.flags.markSolutionEnabled).toBe(true);
				expect(updated?.flags.autoThreadEnabled).toBe(true);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findManyChannelsByDiscordIds", () => {
		it.scoped("should return matching channels", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel1 = yield* createChannel(server.discordId, {
					name: "channel-1",
				});
				const channel2 = yield* createChannel(server.discordId, {
					name: "channel-2",
				});

				const channels =
					yield* database.private.channels.findManyChannelsByDiscordIds(
						{ discordIds: [channel1.id, channel2.id] },
						{ subscribe: false },
					);

				expect(channels.length).toBe(2);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should filter out non-existent channels", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);
				const fakeId = BigInt(999999999999);

				const channels =
					yield* database.private.channels.findManyChannelsByDiscordIds(
						{ discordIds: [channel.id, fakeId] },
						{ subscribe: false },
					);

				expect(channels.length).toBe(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("deleteChannel", () => {
		it.scoped("should delete a channel", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);

				yield* database.private.channels.deleteChannel({ id: channel.id });

				const deleted = yield* database.private.channels.findChannelByDiscordId(
					{ discordId: channel.id },
					{ subscribe: false },
				);
				expect(deleted).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
