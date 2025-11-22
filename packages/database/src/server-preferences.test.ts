import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
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
	serverId: string,
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

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const preferences = createTestServerPreferences(serverId, {
			customDomain: "example.com",
		});
		yield* database.server_preferences.createServerPreferences({
			preferences,
		});

		const liveData =
			yield* database.server_preferences.getServerPreferencesByServerId({
				serverId,
			});

		expect(liveData?.serverId).toBe(serverId);
		expect(liveData?.customDomain).toBe("example.com");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"getServerPreferencesByServerId returns null for non-existent preferences",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.servers.upsertServer(testServer);
			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: "server123",
			});
			const serverId = serverLiveData?.discordId;

			if (!serverId) {
				throw new Error("Server not found");
			}

			const liveData =
				yield* database.server_preferences.getServerPreferencesByServerId({
					serverId,
				});

			expect(liveData).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createServerPreferences prevents duplicate custom domains", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData1 = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId1 = serverLiveData1?.discordId;

		if (!serverId1) {
			throw new Error("Server not found");
		}

		const preferences1 = createTestServerPreferences(serverId1, {
			customDomain: "example.com",
		});
		yield* database.server_preferences.createServerPreferences({
			preferences: preferences1,
		});

		const testServer2: Server = {
			...testServer,
			discordId: "server456",
		};
		yield* database.servers.upsertServer(testServer2);
		const serverLiveData2 = yield* database.servers.getServerByDiscordId({
			discordId: "server456",
		});
		const serverId2 = serverLiveData2?.discordId;

		if (!serverId2) {
			throw new Error("Server not found");
		}

		const preferences2 = createTestServerPreferences(serverId2, {
			customDomain: "example.com",
		});

		const result = yield* Effect.either(
			database.server_preferences.createServerPreferences({
				preferences: preferences2,
			}),
		);

		expect(result._tag).toBe("Left");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateServerPreferences updates existing preferences", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const preferences = createTestServerPreferences(serverId, {
			customDomain: "example.com",
		});
		yield* database.server_preferences.createServerPreferences({
			preferences,
		});

		const updated = createTestServerPreferences(serverId, {
			customDomain: "updated.com",
			considerAllMessagesPublicEnabled: true,
		});

		yield* database.server_preferences.updateServerPreferences({
			preferences: updated,
		});

		const liveData =
			yield* database.server_preferences.getServerPreferencesByServerId({
				serverId,
			});

		expect(liveData?.customDomain).toBe("updated.com");
		expect(liveData?.considerAllMessagesPublicEnabled).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertServerPreferences creates or updates preferences", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const preferences1 = createTestServerPreferences(serverId, {
			customDomain: "example.com",
		});
		yield* database.server_preferences.upsertServerPreferences(preferences1);

		const liveData1 =
			yield* database.server_preferences.getServerPreferencesByServerId({
				serverId,
			});
		expect(liveData1?.customDomain).toBe("example.com");

		const preferences2 = createTestServerPreferences(serverId, {
			customDomain: "updated.com",
		});
		yield* database.server_preferences.upsertServerPreferences(preferences2);

		const liveData2 =
			yield* database.server_preferences.getServerPreferencesByServerId({
				serverId,
			});
		expect(liveData2?.customDomain).toBe("updated.com");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("server preferences handle all flag types", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?.discordId;

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

		yield* database.server_preferences.createServerPreferences({
			preferences,
		});

		const liveData =
			yield* database.server_preferences.getServerPreferencesByServerId({
				serverId,
			});

		expect(liveData?.readTheRulesConsentEnabled).toBe(true);
		expect(liveData?.considerAllMessagesPublicEnabled).toBe(true);
		expect(liveData?.anonymizeMessagesEnabled).toBe(true);
		expect(liveData?.customDomain).toBe("example.com");
		expect(liveData?.subpath).toBe("/path");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
