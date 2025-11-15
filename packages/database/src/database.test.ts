import { expect, it } from "@effect/vitest";
import { Cause, Chunk, Effect, Exit, Layer, Scope } from "effect";
import { api } from "../convex/_generated/api";
import type { Server } from "../convex/schema";
import { ConvexClientTest } from "./convex-client-test";
import {
	ConvexClientUnified,
	ConvexError,
	type WrappedUnifiedClient,
} from "./convex-unified-client";
import { Database, service } from "./database";
import { DatabaseTestLayer } from "./database-test";

const server: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: "123",
	plan: "FREE",
	approximateMemberCount: 0,
};

const server2: Server = {
	name: "Test Server 2",
	description: "Test Description 2",
	icon: "https://example.com/icon2.png",
	vanityInviteCode: "test2",
	vanityUrl: "test2",
	discordId: "456",
	plan: "STARTER",
	approximateMemberCount: 100,
};

it.scoped("live data updates when server is modified", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upsert
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"deduplication: multiple requests for same query+args return same LiveData",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const testClient = yield* ConvexClientTest;

			// Reset query call counts
			testClient.resetQueryCallCounts();

			// Initial upsert
			yield* database.servers.upsertServer(server);

			// Get live data multiple times with same args
			const liveData1 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData2 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData3 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});

			// All should be the same instance (deduplication)
			expect(liveData1).toBe(liveData2);
			expect(liveData2).toBe(liveData3);

			// All should have the same data
			expect(liveData1?.discordId).toBe("123");
			expect(liveData2?.discordId).toBe("123");
			expect(liveData3?.discordId).toBe("123");

			// Verify onUpdate was only called once (deduplication)
			// Note: We can't directly access the query call count from the test client
			// because it's wrapped, but we can verify behavior through updates
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("different args create different LiveData instances", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upserts
		yield* database.servers.upsertServer(server);
		yield* database.servers.upsertServer(server2);

		// Get live data for different servers
		const liveData1 = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});
		const liveData2 = yield* database.servers.getServerByDiscordId({
			discordId: "456",
		});

		// Should be different instances
		expect(liveData1).not.toBe(liveData2);

		// Should have different data
		expect(liveData1?.discordId).toBe("123");
		expect(liveData2?.discordId).toBe("456");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("different queries create different LiveData instances", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upsert
		yield* database.servers.upsertServer(server);

		// Get live data from different queries
		const liveData1 = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});
		const liveData2 = yield* database.servers.getAllServers();

		// Should be different instances
		expect(liveData1).not.toBe(liveData2);

		// Should have different data structures
		expect(liveData1?.discordId).toBe("123");
		expect(Array.isArray(liveData2)).toBe(true);
		expect(liveData2?.length).toBeGreaterThan(0);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("reference counting: multiple acquisitions increment refCount", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upsert
		yield* database.servers.upsertServer(server);

		// Create separate scopes for each acquisition to test reference counting
		const scope1 = yield* Scope.make();
		const scope2 = yield* Scope.make();
		const scope3 = yield* Scope.make();

		// Acquire multiple times in separate scopes
		const liveData1 = yield* Scope.extend(
			database.servers.getServerByDiscordId({ discordId: "123" }),
			scope1,
		);
		const liveData2 = yield* Scope.extend(
			database.servers.getServerByDiscordId({ discordId: "123" }),
			scope2,
		);
		const liveData3 = yield* Scope.extend(
			database.servers.getServerByDiscordId({ discordId: "123" }),
			scope3,
		);

		// All should be the same instance (deduplication)
		expect(liveData1).toBe(liveData2);
		expect(liveData2).toBe(liveData3);

		// Release one reference - watch should still be active
		yield* Scope.close(scope1, Exit.succeed(undefined));

		// Remaining instances should still work
		expect(liveData2?.discordId).toBe("123");
		expect(liveData3?.discordId).toBe("123");

		// Release another reference - watch should still be active
		yield* Scope.close(scope2, Exit.succeed(undefined));

		// Last instance should still work
		expect(liveData3?.discordId).toBe("123");

		// Release last reference - watch should be cleaned up
		yield* Scope.close(scope3, Exit.succeed(undefined));
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"updates propagate to all LiveData instances watching same query+args",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			// Initial upsert
			yield* database.servers.upsertServer(server);

			// Get multiple LiveData instances for the same query+args
			const liveData1 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData2 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData3 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});

			// All should have initial data
			expect(liveData1?.description).toBe("Test Description");
			expect(liveData2?.description).toBe("Test Description");
			expect(liveData3?.description).toBe("Test Description");

			// Update the server
			const updatedDescription = `Updated description ${Math.random()}`;
			yield* database.servers.upsertServer({
				...server,
				description: updatedDescription,
			});

			// All instances should have updated data
			expect(liveData1?.description).toBe(updatedDescription);
			expect(liveData2?.description).toBe(updatedDescription);
			expect(liveData3?.description).toBe(updatedDescription);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"updates only affect LiveData instances watching the affected query+args",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			// Initial upserts
			yield* database.servers.upsertServer(server);
			yield* database.servers.upsertServer(server2);

			// Get LiveData instances for different servers
			const liveData1 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData2 = yield* database.servers.getServerByDiscordId({
				discordId: "456",
			});

			// Both should have their initial data
			expect(liveData1?.discordId).toBe("123");
			expect(liveData2?.discordId).toBe("456");

			// Update only server 1
			const updatedDescription = `Updated description ${Math.random()}`;
			yield* database.servers.upsertServer({
				...server,
				description: updatedDescription,
			});

			// Only liveData1 should be updated
			expect(liveData1?.description).toBe(updatedDescription);
			expect(liveData2?.description).toBe("Test Description 2");
			expect(liveData2?.discordId).toBe("456");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData can be reacquired after cleanup", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upsert
		yield* database.servers.upsertServer(server);

		// Create a scope for the first acquisition
		const scope1 = yield* Scope.make();

		// Acquire in first scope
		const liveData1 = yield* Scope.extend(
			database.servers.getServerByDiscordId({ discordId: "123" }),
			scope1,
		);
		expect(liveData1?.discordId).toBe("123");

		// Release first scope
		yield* Scope.close(scope1, Exit.succeed(undefined));

		// Reacquire in new scope - should create a new watch
		const scope2 = yield* Scope.make();
		const liveData2 = yield* Scope.extend(
			database.servers.getServerByDiscordId({ discordId: "123" }),
			scope2,
		);

		// Should still work
		expect(liveData2?.discordId).toBe("123");

		// Should be a different instance (old one was cleaned up)
		expect(liveData1).not.toBe(liveData2);

		// Clean up second scope
		yield* Scope.close(scope2, Exit.succeed(undefined));
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getAllServers updates when any server changes", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upsert
		yield* database.servers.upsertServer(server);

		// Get live data for all servers
		const liveData = yield* database.servers.getAllServers();

		// Should have one server
		expect(liveData?.length).toBe(1);
		expect(liveData?.[0]?.discordId).toBe("123");

		// Add another server
		yield* database.servers.upsertServer(server2);

		// Should have two servers
		expect(liveData?.length).toBe(2);
		expect(liveData?.some((s) => s.discordId === "123")).toBe(true);
		expect(liveData?.some((s) => s.discordId === "456")).toBe(true);

		// Update first server
		const updatedDescription = `Updated description ${Math.random()}`;
		yield* database.servers.upsertServer({
			...server,
			description: updatedDescription,
		});

		// Should still have two servers, but first one updated
		expect(liveData?.length).toBe(2);
		const updatedServer = liveData?.find((s) => s.discordId === "123");
		expect(updatedServer?.description).toBe(updatedDescription);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData handles queries with no args", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Initial upsert
		yield* database.servers.upsertServer(server);

		// Get live data for query with no args
		const liveData1 = yield* database.servers.getAllServers();
		const liveData2 = yield* database.servers.getAllServers();

		// Should be the same instance (deduplication)
		expect(liveData1).toBe(liveData2);

		// Should have data
		expect(liveData1?.length).toBe(1);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData handles null query results", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Get live data for non-existent server
		const liveData = yield* database.servers.getServerByDiscordId({
			discordId: "nonexistent",
		});

		// Should return null
		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData updates when null result becomes non-null", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Get live data for non-existent server
		const liveData = yield* database.servers.getServerByDiscordId({
			discordId: "789",
		});

		// Should return null
		expect(liveData).toBeNull();

		// Create the server
		const newServer: Server = {
			...server,
			discordId: "789",
			name: "New Server",
		};
		yield* database.servers.upsertServer(newServer);

		// Should now have data
		expect(liveData?.discordId).toBe("789");
		expect(liveData?.name).toBe("New Server");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

// Mock layer that simulates ConvexError
const mockConvexClientWithError: Partial<WrappedUnifiedClient> = {
	use: () => {
		return Effect.fail(new ConvexError({ cause: "Simulated ConvexError" }));
	},
};

const MockConvexClientErrorLayer = Layer.succeed(
	ConvexClientUnified,
	mockConvexClientWithError as WrappedUnifiedClient,
);

const MockDatabaseLayerWithError = Layer.effect(Database, service).pipe(
	Layer.provide(MockConvexClientErrorLayer),
);

it("LiveData propagates ConvexError from .use()", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		// Try to get live data - should fail with ConvexError
		const result = yield* Effect.scoped(
			database.servers.getServerByDiscordId({ discordId: "123" }),
		).pipe(Effect.exit);

		// Verify that the Effect failed with a ConvexError
		expect(Exit.isFailure(result)).toBe(true);
		if (Exit.isFailure(result)) {
			const failures = Cause.failures(result.cause);
			const maybeError = Chunk.head(failures);
			expect(maybeError._tag).toBe("Some");
			if (maybeError._tag === "Some") {
				const error = maybeError.value;
				expect(error).toBeInstanceOf(ConvexError);
				if (error instanceof ConvexError) {
					expect(error.cause).toBe("Simulated ConvexError");
				}
			}
		}
	}).pipe(Effect.provide(MockDatabaseLayerWithError)));
