import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { Database } from "../../src/database";
import { DatabaseTestLayer } from "../../src/database-test";
import {
	createChannel,
	createServer,
	enableChannelIndexing,
} from "../../src/test";

describe("public/servers", () => {
	describe("getServerByDomain", () => {
		it.scoped("should return null for non-existent domain", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const result = yield* database.public.servers.getServerByDomain(
					{ domain: "nonexistent.example.com" },
					{ subscribe: false },
				);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return server with custom domain", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer({ name: "Domain Server" });

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "PRO",
					customDomain: "custom.example.com",
					subpath: "/community",
				});

				const result = yield* database.public.servers.getServerByDomain(
					{ domain: "custom.example.com" },
					{ subscribe: false },
				);

				expect(result).not.toBeNull();
				expect(result?.server.name).toBe("Domain Server");
				expect(result?.preferences.customDomain).toBe("custom.example.com");
				expect(result?.preferences.subpath).toBe("/community");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getBrowseServers", () => {
		it.scoped("should return only servers with indexed channels", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const indexedServer = yield* createServer({ name: "Indexed Server" });
				const channel = yield* createChannel(indexedServer.discordId);
				yield* enableChannelIndexing(channel.id);

				yield* createServer({ name: "Non-Indexed Server" });

				const servers = yield* database.public.servers.getBrowseServers(
					{},
					{ subscribe: false },
				);

				const foundIndexed = servers.find((s) => s.name === "Indexed Server");
				const foundNonIndexed = servers.find(
					(s) => s.name === "Non-Indexed Server",
				);

				expect(foundIndexed).toBeDefined();
				expect(foundNonIndexed).toBeUndefined();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should sort by member count descending", () =>
			Effect.gen(function* () {
				const database = yield* Database;

				const smallServer = yield* createServer({
					name: "Small Server",
					approximateMemberCount: 100,
				});
				const smallChannel = yield* createChannel(smallServer.discordId);
				yield* enableChannelIndexing(smallChannel.id);

				const largeServer = yield* createServer({
					name: "Large Server",
					approximateMemberCount: 10000,
				});
				const largeChannel = yield* createChannel(largeServer.discordId);
				yield* enableChannelIndexing(largeChannel.id);

				const servers = yield* database.public.servers.getBrowseServers(
					{},
					{ subscribe: false },
				);

				const smallIdx = servers.findIndex((s) => s.name === "Small Server");
				const largeIdx = servers.findIndex((s) => s.name === "Large Server");

				expect(largeIdx).toBeLessThan(smallIdx);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});

	describe("getServerByDiscordIdWithChannels", () => {
		it.scoped("should return null for non-existent server", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const nonExistentId = BigInt(999999999999);

				const result =
					yield* database.public.servers.getServerByDiscordIdWithChannels(
						{ discordId: nonExistentId },
						{ subscribe: false },
					);

				expect(result).toBeNull();
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should return server with indexed channels", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer({ name: "With Channels" });
				const channel = yield* createChannel(server.discordId, {
					name: "general",
					type: 0,
				});
				yield* enableChannelIndexing(channel.id);

				const result =
					yield* database.public.servers.getServerByDiscordIdWithChannels(
						{ discordId: server.discordId },
						{ subscribe: false },
					);

				expect(result).not.toBeNull();
				expect(result?.server.name).toBe("With Channels");
				expect(result?.channels.length).toBeGreaterThanOrEqual(1);
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);

		it.scoped("should include custom domain in response", () =>
			Effect.gen(function* () {
				const database = yield* Database;
				const server = yield* createServer({ name: "Custom Domain Server" });

				yield* database.private.server_preferences.upsertServerPreferences({
					serverId: server.discordId,
					plan: "PRO",
					customDomain: "myserver.example.com",
				});

				const result =
					yield* database.public.servers.getServerByDiscordIdWithChannels(
						{ discordId: server.discordId },
						{ subscribe: false },
					);

				expect(result?.server.customDomain).toBe("myserver.example.com");
			}).pipe(Effect.provide(DatabaseTestLayer)),
		);
	});
});
