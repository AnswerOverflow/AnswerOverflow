import { expect, it } from "@effect/vitest";
import { Cause, Chunk, Effect, Exit, Layer, Scope } from "effect";
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
		const _database = yield* Database;
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped.only(
	"deduplication: multiple requests for same query+args return same LiveData",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const testClient = yield* ConvexClientTest;

			testClient.resetQueryCallCounts();

			yield* database.servers.upsertServer(server);

			const liveData1 = yield* database.servers.getServerByDiscordId(
				{
					discordId: "123",
				},
				{ subscribe: true },
			);
			const liveData2 = yield* database.servers.getServerByDiscordId(
				{
					discordId: "123",
				},
				{ subscribe: true },
			);
			const liveData3 = yield* database.servers.getServerByDiscordId(
				{
					discordId: "123",
				},
				{ subscribe: true },
			);
			console.log(liveData1?.data?.discordId);

			expect(liveData1).toBe(liveData2);
			expect(liveData2).toBe(liveData3);

			expect(liveData1?.data?.discordId).toBe("123");
			expect(liveData2?.data?.discordId).toBe("123");
			expect(liveData3?.data?.discordId).toBe("123");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("different args create different LiveData instances", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);
		yield* database.servers.upsertServer(server2);

		const liveData1 = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});
		const liveData2 = yield* database.servers.getServerByDiscordId({
			discordId: "456",
		});

		expect(liveData1).not.toBe(liveData2);

		expect(liveData1?.discordId).toBe("123");
		expect(liveData2?.discordId).toBe("456");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("different queries create different LiveData instances", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const liveData1 = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});
		const liveData2 = yield* database.servers.getAllServers();

		expect(liveData1).not.toBe(liveData2);

		expect(liveData1?.discordId).toBe("123");
		expect(Array.isArray(liveData2)).toBe(true);
		expect(liveData2?.length).toBeGreaterThan(0);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("reference counting: multiple acquisitions increment refCount", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const scope1 = yield* Scope.make();
		const scope2 = yield* Scope.make();
		const scope3 = yield* Scope.make();

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

		expect(liveData1).toBe(liveData2);
		expect(liveData2).toBe(liveData3);

		yield* Scope.close(scope1, Exit.succeed(undefined));

		expect(liveData2?.discordId).toBe("123");
		expect(liveData3?.discordId).toBe("123");

		yield* Scope.close(scope2, Exit.succeed(undefined));

		expect(liveData3?.discordId).toBe("123");

		yield* Scope.close(scope3, Exit.succeed(undefined));
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"updates propagate to all LiveData instances watching same query+args",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.servers.upsertServer(server);

			const liveData1 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData2 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData3 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});

			expect(liveData1?.description).toBe("Test Description");
			expect(liveData2?.description).toBe("Test Description");
			expect(liveData3?.description).toBe("Test Description");

			const updatedDescription = `Updated description ${Math.random()}`;
			yield* database.servers.upsertServer({
				...server,
				description: updatedDescription,
			});

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

			yield* database.servers.upsertServer(server);
			yield* database.servers.upsertServer(server2);

			const liveData1 = yield* database.servers.getServerByDiscordId({
				discordId: "123",
			});
			const liveData2 = yield* database.servers.getServerByDiscordId({
				discordId: "456",
			});

			expect(liveData1?.discordId).toBe("123");
			expect(liveData2?.discordId).toBe("456");

			const updatedDescription = `Updated description ${Math.random()}`;
			yield* database.servers.upsertServer({
				...server,
				description: updatedDescription,
			});

			expect(liveData1?.description).toBe(updatedDescription);
			expect(liveData2?.description).toBe("Test Description 2");
			expect(liveData2?.discordId).toBe("456");
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData can be reacquired after cleanup", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const scope1 = yield* Scope.make();

		const liveData1 = yield* Scope.extend(
			database.servers.getServerByDiscordId({ discordId: "123" }),
			scope1,
		);
		expect(liveData1?.discordId).toBe("123");

		yield* Scope.close(scope1, Exit.succeed(undefined));

		const scope2 = yield* Scope.make();
		const liveData2 = yield* Scope.extend(
			database.servers.getServerByDiscordId({ discordId: "123" }),
			scope2,
		);

		expect(liveData2?.discordId).toBe("123");

		expect(liveData1).not.toBe(liveData2);

		yield* Scope.close(scope2, Exit.succeed(undefined));
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getAllServers updates when any server changes", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const liveData = yield* database.servers.getAllServers();

		expect(liveData?.length).toBe(1);
		expect(liveData?.[0]?.discordId).toBe("123");

		yield* database.servers.upsertServer(server2);

		expect(liveData?.length).toBe(2);
		expect(liveData?.some((s) => s.discordId === "123")).toBe(true);
		expect(liveData?.some((s) => s.discordId === "456")).toBe(true);

		const updatedDescription = `Updated description ${Math.random()}`;
		yield* database.servers.upsertServer({
			...server,
			description: updatedDescription,
		});

		expect(liveData?.length).toBe(2);
		const updatedServer = liveData?.find((s) => s.discordId === "123");
		expect(updatedServer?.description).toBe(updatedDescription);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData handles queries with no args", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const liveData1 = yield* database.servers.getAllServers();
		const liveData2 = yield* database.servers.getAllServers();

		expect(liveData1).toBe(liveData2);

		expect(liveData1?.length).toBe(1);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData handles null query results", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const liveData = yield* database.servers.getServerByDiscordId({
			discordId: "nonexistent",
		});

		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData updates when null result becomes non-null", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const liveData = yield* database.servers.getServerByDiscordId({
			discordId: "789",
		});

		expect(liveData).toBeNull();

		const newServer: Server = {
			...server,
			discordId: "789",
			name: "New Server",
		};
		yield* database.servers.upsertServer(newServer);

		expect(liveData?.discordId).toBe("789");
		expect(liveData?.name).toBe("New Server");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

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

		const result = yield* Effect.scoped(
			database.servers.getServerByDiscordId({ discordId: "123" }),
		).pipe(Effect.exit);

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
