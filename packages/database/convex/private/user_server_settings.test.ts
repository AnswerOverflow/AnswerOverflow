import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import {
	createAuthor,
	createChannel,
	createMessage,
	createServer,
	enableChannelIndexing,
	makeMessagesPublic,
} from "../../src/test";

describe("user_server_settings", () => {
	describe("upsertUserServerSettings", () => {
		it.scoped("should create new settings", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const author = yield* createAuthor();

				const result =
					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: author.id,
								serverId: server.discordId,
								permissions: 32,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: false,
								apiCallsUsed: 0,
							},
						},
					);

				expect(result.userId).toBe(author.id);
				expect(result.serverId).toBe(server.discordId);
				expect(result.permissions).toBe(32);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should update existing settings", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const author = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 32,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result =
					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: author.id,
								serverId: server.discordId,
								permissions: 64,
								canPubliclyDisplayMessages: false,
								messageIndexingDisabled: false,
								apiCallsUsed: 5,
							},
						},
					);

				expect(result.permissions).toBe(64);
				expect(result.canPubliclyDisplayMessages).toBe(false);
				expect(result.apiCallsUsed).toBe(5);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should disable public display when indexing is disabled", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const author = yield* createAuthor();

				const result =
					yield* database.private.user_server_settings.upsertUserServerSettings(
						{
							settings: {
								userId: author.id,
								serverId: server.discordId,
								permissions: 32,
								canPubliclyDisplayMessages: true,
								messageIndexingDisabled: true,
								apiCallsUsed: 0,
							},
						},
					);

				expect(result.messageIndexingDisabled).toBe(true);
				expect(result.canPubliclyDisplayMessages).toBe(false);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should delete messages when indexing is newly disabled", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const channel = yield* createChannel(server.discordId);
				const author = yield* createAuthor();

				yield* enableChannelIndexing(channel.id);
				yield* makeMessagesPublic(server.discordId);

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 32,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const message = yield* createMessage(
					{
						authorId: author.id,
						serverId: server.discordId,
						channelId: channel.id,
					},
					{ content: "Will be deleted" },
				);

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 32,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: true,
						apiCallsUsed: 0,
					},
				});

				const deleted = yield* database.private.messages.getMessageById(
					{ id: message.id },
					{ subscribe: false },
				);
				expect(deleted).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findUserServerSettingsById", () => {
		it.scoped("should return null for non-existent settings", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentUserId = BigInt(999999999999);
				const nonExistentServerId = BigInt(888888888888);

				const result =
					yield* database.private.user_server_settings.findUserServerSettingsById(
						{ userId: nonExistentUserId, serverId: nonExistentServerId },
						{ subscribe: false },
					);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return existing settings", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const author = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server.discordId,
						permissions: 128,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result =
					yield* database.private.user_server_settings.findUserServerSettingsById(
						{ userId: author.id, serverId: server.discordId },
						{ subscribe: false },
					);

				expect(result).not.toBeNull();
				expect(result?.permissions).toBe(128);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("findManyUserServerSettings", () => {
		it.scoped("should return matching settings", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server1 = yield* createServer();
				const server2 = yield* createServer();
				const author = yield* createAuthor();

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server1.discordId,
						permissions: 32,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				yield* database.private.user_server_settings.upsertUserServerSettings({
					settings: {
						userId: author.id,
						serverId: server2.discordId,
						permissions: 64,
						canPubliclyDisplayMessages: true,
						messageIndexingDisabled: false,
						apiCallsUsed: 0,
					},
				});

				const result =
					yield* database.private.user_server_settings.findManyUserServerSettings(
						{
							settings: [
								{ userId: author.id, serverId: server1.discordId },
								{ userId: author.id, serverId: server2.discordId },
							],
						},
						{ subscribe: false },
					);

				expect(result.length).toBe(2);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for empty input", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const result =
					yield* database.private.user_server_settings.findManyUserServerSettings(
						{ settings: [] },
						{ subscribe: false },
					);

				expect(result).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("upsertManyBotUserServerSettings", () => {
		it.scoped("should create multiple settings", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer();
				const author1 = yield* createAuthor();
				const author2 = yield* createAuthor();

				const result =
					yield* database.private.user_server_settings.upsertManyBotUserServerSettings(
						{
							settings: [
								{
									userId: author1.id,
									serverId: server.discordId,
									permissions: 32,
									canPubliclyDisplayMessages: true,
									messageIndexingDisabled: false,
									apiCallsUsed: 0,
								},
								{
									userId: author2.id,
									serverId: server.discordId,
									permissions: 64,
									canPubliclyDisplayMessages: true,
									messageIndexingDisabled: false,
									apiCallsUsed: 0,
								},
							],
						},
					);

				expect(result.length).toBe(2);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return empty for empty input", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const result =
					yield* database.private.user_server_settings.upsertManyBotUserServerSettings(
						{ settings: [] },
					);

				expect(result).toEqual([]);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
