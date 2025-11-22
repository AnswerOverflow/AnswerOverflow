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

const _createTestUserServerSettings = (
	userId: string,
	serverId: string,
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

			yield* database.servers.upsertServer(testServer);
			const serverLiveData = yield* database.servers.getServerByDiscordId({
				discordId: "server123",
			});
			const serverId = serverLiveData?.discordId;

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
