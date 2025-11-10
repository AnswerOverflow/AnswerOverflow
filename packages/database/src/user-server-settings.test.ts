// Tests for user server settings functions

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { Id } from "../convex/_generated/dataModel";
import type { Server, UserServerSettings } from "../convex/schema";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

const testServer: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: "server123",
	plan: "FREE",
	approximateMemberCount: 0,
};

const createTestUserServerSettings = (
	userId: string,
	serverId: Id<"servers">,
	overrides?: Partial<UserServerSettings>,
): UserServerSettings => ({
	userId,
	serverId,
	permissions: 0,
	canPubliclyDisplayMessages: false,
	messageIndexingDisabled: false,
	apiKey: undefined,
	apiCallsUsed: 0,
	...overrides,
});

it.scoped("findUserServerSettingsById returns settings", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const settings = createTestUserServerSettings("user123", serverId);
		yield* database.userServerSettings.createUserServerSettings(settings);

		const liveData =
			yield* database.userServerSettings.findUserServerSettingsById(
				"user123",
				serverId,
			);

		expect(liveData?.data?.userId).toBe("user123");
		expect(liveData?.data?.serverId).toBe(serverId);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"findUserServerSettingsById returns null for non-existent settings",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			// Create server
			yield* database.servers.upsertServer(testServer);
			const serverLiveData =
				yield* database.servers.getServerByDiscordId("server123");
			const serverId = serverLiveData?.data?._id;

			if (!serverId) {
				throw new Error("Server not found");
			}

			const liveData =
				yield* database.userServerSettings.findUserServerSettingsById(
					"user123",
					serverId,
				);

			expect(liveData?.data).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createUserServerSettings creates new settings", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const settings = createTestUserServerSettings("user123", serverId, {
			canPubliclyDisplayMessages: true,
		});

		yield* database.userServerSettings.createUserServerSettings(settings);

		const liveData =
			yield* database.userServerSettings.findUserServerSettingsById(
				"user123",
				serverId,
			);

		expect(liveData?.data?.canPubliclyDisplayMessages).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateUserServerSettings updates existing settings", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const settings = createTestUserServerSettings("user123", serverId);
		yield* database.userServerSettings.createUserServerSettings(settings);

		const updated = createTestUserServerSettings("user123", serverId, {
			canPubliclyDisplayMessages: true,
			permissions: 8,
		});

		yield* database.userServerSettings.updateUserServerSettings(updated);

		const liveData =
			yield* database.userServerSettings.findUserServerSettingsById(
				"user123",
				serverId,
			);

		expect(liveData?.data?.canPubliclyDisplayMessages).toBe(true);
		expect(liveData?.data?.permissions).toBe(8);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateUserServerSettings prevents invalid configuration", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const settings = createTestUserServerSettings("user123", serverId);
		yield* database.userServerSettings.createUserServerSettings(settings);

		// Try to set both canPubliclyDisplayMessages and messageIndexingDisabled
		const invalid = createTestUserServerSettings("user123", serverId, {
			canPubliclyDisplayMessages: true,
			messageIndexingDisabled: true,
		});

		const result = yield* Effect.either(
			database.userServerSettings.updateUserServerSettings(invalid),
		);

		expect(result._tag).toBe("Left");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"updateUserServerSettings deletes messages when disabling indexing",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			// Create server
			yield* database.servers.upsertServer(testServer);
			const serverLiveData =
				yield* database.servers.getServerByDiscordId("server123");
			const serverId = serverLiveData?.data?._id;

			if (!serverId) {
				throw new Error("Server not found");
			}

			// Create channel
			const channel = {
				id: "channel123",
				serverId,
				name: "Test Channel",
				type: 0,
			};
			yield* database.channels.upsertChannelWithSettings({ channel });

			// Create user server settings
			const settings = createTestUserServerSettings("user123", serverId);
			yield* database.userServerSettings.createUserServerSettings(settings);

			// Create message
			const message = {
				id: "message123",
				authorId: "user123",
				serverId,
				channelId: "channel123",
				content: "Test message",
			};
			yield* database.messages.upsertMessage({
				message,
				ignoreChecks: true,
			});

			// Verify message exists
			const beforeUpdate =
				yield* database.messages.getMessageById("message123");
			expect(beforeUpdate?.data?.id).toBe("message123");

			// Disable message indexing
			const updated = createTestUserServerSettings("user123", serverId, {
				messageIndexingDisabled: true,
			});
			yield* database.userServerSettings.updateUserServerSettings(updated);

			// Verify message is deleted
			const afterUpdate = yield* database.messages.getMessageById("message123");
			expect(afterUpdate?.data).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertUserServerSettings creates or updates settings", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// First upsert (create)
		const settings1 = createTestUserServerSettings("user123", serverId);
		yield* database.userServerSettings.upsertUserServerSettings(settings1);

		const liveData1 =
			yield* database.userServerSettings.findUserServerSettingsById(
				"user123",
				serverId,
			);
		expect(liveData1?.data?.userId).toBe("user123");

		// Second upsert (update)
		const settings2 = createTestUserServerSettings("user123", serverId, {
			canPubliclyDisplayMessages: true,
		});
		yield* database.userServerSettings.upsertUserServerSettings(settings2);

		const liveData2 =
			yield* database.userServerSettings.findUserServerSettingsById(
				"user123",
				serverId,
			);
		expect(liveData2?.data?.canPubliclyDisplayMessages).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findManyUserServerSettings returns multiple settings", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const settings1 = createTestUserServerSettings("user1", serverId);
		const settings2 = createTestUserServerSettings("user2", serverId);
		const settings3 = createTestUserServerSettings("user3", serverId);

		yield* database.userServerSettings.createUserServerSettings(settings1);
		yield* database.userServerSettings.createUserServerSettings(settings2);
		yield* database.userServerSettings.createUserServerSettings(settings3);

		const liveData =
			yield* database.userServerSettings.findManyUserServerSettings([
				{ userId: "user1", serverId },
				{ userId: "user2", serverId },
				{ userId: "user3", serverId },
			]);

		expect(liveData?.data?.length).toBe(3);
		const userIds = liveData?.data?.map((s) => s.userId) ?? [];
		expect(userIds).toContain("user1");
		expect(userIds).toContain("user2");
		expect(userIds).toContain("user3");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findUserServerSettingsByApiKey returns settings by API key", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const apiKey = "test-api-key-123";
		const settings = createTestUserServerSettings("user123", serverId, {
			apiKey,
		});

		yield* database.userServerSettings.createUserServerSettings(settings);

		const liveData =
			yield* database.userServerSettings.findUserServerSettingsByApiKey(apiKey);

		expect(liveData?.data?.apiKey).toBe(apiKey);
		expect(liveData?.data?.userId).toBe("user123");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("increaseApiKeyUsage increments apiCallsUsed", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId = serverLiveData?.data?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const apiKey = "test-api-key-123";
		const settings = createTestUserServerSettings("user123", serverId, {
			apiKey,
			apiCallsUsed: 5,
		});

		yield* database.userServerSettings.createUserServerSettings(settings);

		// Increase usage
		yield* database.userServerSettings.increaseApiKeyUsage(apiKey);

		const liveData =
			yield* database.userServerSettings.findUserServerSettingsByApiKey(apiKey);

		expect(liveData?.data?.apiCallsUsed).toBe(6);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
