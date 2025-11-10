// Tests for server preferences functions

import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import type { Id } from "../convex/_generated/dataModel";
import type { Server, ServerPreferences } from "../convex/schema";
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

const createTestServerPreferences = (
	serverId: Id<"servers">,
	overrides?: Partial<ServerPreferences>,
): ServerPreferences => ({
	serverId,
	readTheRulesConsentEnabled: undefined,
	considerAllMessagesPublicEnabled: undefined,
	anonymizeMessagesEnabled: undefined,
	customDomain: undefined,
	subpath: undefined,
	...overrides,
});

it.scoped("getServerPreferencesByServerId returns preferences", () =>
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

		const preferences = createTestServerPreferences(serverId, {
			customDomain: "example.com",
		});
		yield* database.serverPreferences.createServerPreferences(preferences);

		const liveData =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);

		expect(liveData?.data?.serverId).toBe(serverId);
		expect(liveData?.data?.customDomain).toBe("example.com");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"getServerPreferencesByServerId returns null for non-existent preferences",
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
				yield* database.serverPreferences.getServerPreferencesByServerId(
					serverId,
				);

			expect(liveData?.data).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createServerPreferences creates new preferences", () =>
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

		const preferences = createTestServerPreferences(serverId, {
			customDomain: "example.com",
			considerAllMessagesPublicEnabled: true,
		});

		yield* database.serverPreferences.createServerPreferences(preferences);

		const liveData =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);

		expect(liveData?.data?.customDomain).toBe("example.com");
		expect(liveData?.data?.considerAllMessagesPublicEnabled).toBe(true);

		// Verify server references preferences
		const server = yield* database.servers.getServerById(serverId);
		expect(server?.data?.preferencesId).toBeDefined();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createServerPreferences prevents duplicate custom domains", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create first server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData1 =
			yield* database.servers.getServerByDiscordId("server123");
		const serverId1 = serverLiveData1?.data?._id;

		if (!serverId1) {
			throw new Error("Server not found");
		}

		const preferences1 = createTestServerPreferences(serverId1, {
			customDomain: "example.com",
		});
		yield* database.serverPreferences.createServerPreferences(preferences1);

		// Create second server
		const testServer2: Server = {
			...testServer,
			discordId: "server456",
		};
		yield* database.servers.upsertServer(testServer2);
		const serverLiveData2 =
			yield* database.servers.getServerByDiscordId("server456");
		const serverId2 = serverLiveData2?.data?._id;

		if (!serverId2) {
			throw new Error("Server not found");
		}

		// Try to create preferences with same custom domain
		const preferences2 = createTestServerPreferences(serverId2, {
			customDomain: "example.com",
		});

		const result = yield* Effect.either(
			database.serverPreferences.createServerPreferences(preferences2),
		);

		expect(result._tag).toBe("Left");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateServerPreferences updates existing preferences", () =>
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

		const preferences = createTestServerPreferences(serverId, {
			customDomain: "example.com",
		});
		yield* database.serverPreferences.createServerPreferences(preferences);

		const updated = createTestServerPreferences(serverId, {
			customDomain: "updated.com",
			considerAllMessagesPublicEnabled: true,
		});

		yield* database.serverPreferences.updateServerPreferences(updated);

		const liveData =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);

		expect(liveData?.data?.customDomain).toBe("updated.com");
		expect(liveData?.data?.considerAllMessagesPublicEnabled).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertServerPreferences creates or updates preferences", () =>
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
		const preferences1 = createTestServerPreferences(serverId, {
			customDomain: "example.com",
		});
		yield* database.serverPreferences.upsertServerPreferences(preferences1);

		const liveData1 =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);
		expect(liveData1?.data?.customDomain).toBe("example.com");

		// Second upsert (update)
		const preferences2 = createTestServerPreferences(serverId, {
			customDomain: "updated.com",
		});
		yield* database.serverPreferences.upsertServerPreferences(preferences2);

		const liveData2 =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);
		expect(liveData2?.data?.customDomain).toBe("updated.com");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("deleteServerPreferences removes preferences", () =>
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

		const preferences = createTestServerPreferences(serverId, {
			customDomain: "example.com",
		});
		yield* database.serverPreferences.createServerPreferences(preferences);

		// Verify preferences exist
		const beforeDelete =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);
		expect(beforeDelete?.data?.customDomain).toBe("example.com");

		// Delete preferences
		yield* database.serverPreferences.deleteServerPreferences(serverId);

		// Verify preferences are deleted
		const afterDelete =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);
		expect(afterDelete?.data).toBeNull();

		// Verify server no longer references preferences
		const server = yield* database.servers.getServerById(serverId);
		expect(server?.data?.preferencesId).toBeUndefined();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("server preferences handle all flag types", () =>
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

		const preferences = createTestServerPreferences(serverId, {
			readTheRulesConsentEnabled: true,
			considerAllMessagesPublicEnabled: true,
			anonymizeMessagesEnabled: true,
			customDomain: "example.com",
			subpath: "/path",
		});

		yield* database.serverPreferences.createServerPreferences(preferences);

		const liveData =
			yield* database.serverPreferences.getServerPreferencesByServerId(
				serverId,
			);

		expect(liveData?.data?.readTheRulesConsentEnabled).toBe(true);
		expect(liveData?.data?.considerAllMessagesPublicEnabled).toBe(true);
		expect(liveData?.data?.anonymizeMessagesEnabled).toBe(true);
		expect(liveData?.data?.customDomain).toBe("example.com");
		expect(liveData?.data?.subpath).toBe("/path");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
