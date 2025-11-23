import { expect, it } from "@effect/vitest";
import { generateSnowflakeString } from "@packages/test-utils/snowflakes";
import { Effect } from "effect";
import type { Server, UserServerSettings } from "../convex/schema";
import { Database } from "./database";
import { DatabaseTestLayer } from "./database-test";

const serverDiscordId = generateSnowflakeString();

const testServer: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: serverDiscordId,
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

			yield* database.private.servers.upsertServer(testServer);
			const serverLiveData =
				yield* database.private.servers.getServerByDiscordId({
					discordId: serverDiscordId,
				});
			const serverId = serverLiveData?.discordId;

			if (!serverId) {
				throw new Error("Server not found");
			}

			const userId = generateSnowflakeString();
			const liveData =
				yield* database.private.user_server_settings.findUserServerSettingsById(
					{
						userId,
						serverId: serverId,
					},
				);

			expect(liveData).toBeNull();
		}).pipe(Effect.provide(DatabaseTestLayer)),
);
