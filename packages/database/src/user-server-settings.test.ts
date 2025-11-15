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

it.scoped(
	"findUserServerSettingsById returns null for non-existent settings",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			// Create server
			yield* database.servers.upsertServer(testServer);
			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: "server123",
			});
			const serverId = serverLiveData?._id;

			if (!serverId) {
				throw new Error("Server not found");
			}

			const liveData =
				yield* database.user_server_settings.findUserServerSettingsById({
					userId: "user123",
					serverId: serverId,
				});

			expect(liveData).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("upsertUserServerSettings creates or updates settings", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Create server
		yield* database.servers.upsertServer(testServer);
		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "server123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		// First upsert (create)
		const settings1 = createTestUserServerSettings("user123", serverId);
		yield* database.user_server_settings.upsertUserServerSettings({
			settings: settings1,
		});

		const liveData1 =
			yield* database.user_server_settings.findUserServerSettingsById({
				userId: "user123",
				serverId,
			});
		expect(liveData1?.userId).toBe("user123");

		// Second upsert (update)
		const settings2 = createTestUserServerSettings("user123", serverId, {
			canPubliclyDisplayMessages: true,
		});
		yield* database.user_server_settings.upsertUserServerSettings({
			settings: settings2,
		});

		const liveData2 =
			yield* database.user_server_settings.findUserServerSettingsById({
				userId: "user123",
				serverId,
			});
		expect(liveData2?.canPubliclyDisplayMessages).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
