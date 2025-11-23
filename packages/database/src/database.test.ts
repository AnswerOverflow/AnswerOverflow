import { expect, it } from "@effect/vitest";
import { generateSnowflakeString } from "@packages/test-utils/snowflakes";
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

const discordId1 = generateSnowflakeString();
const discordId2 = generateSnowflakeString();

const server: Server = {
	name: "Test Server",
	description: "Test Description",
	icon: "https://example.com/icon.png",
	vanityInviteCode: "test",
	vanityUrl: "test",
	discordId: discordId1,
	plan: "FREE",
	approximateMemberCount: 0,
};

const server2: Server = {
	name: "Test Server 2",
	description: "Test Description 2",
	icon: "https://example.com/icon2.png",
	vanityInviteCode: "test2",
	vanityUrl: "test2",
	discordId: discordId2,
	plan: "STARTER",
	approximateMemberCount: 100,
};

it.scoped("live data updates when server is modified", () =>
	Effect.gen(function* () {
		const _database = yield* Database;
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"deduplication: multiple requests for same query+args return same LiveData",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;
			const testClient = yield* ConvexClientTest;

			testClient.resetQueryCallCounts();

			yield* database.private.servers.upsertServer(server);

			const liveData1 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId1,
				},
				{ subscribe: true },
			);
			const liveData2 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId1,
				},
				{ subscribe: true },
			);
			const liveData3 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId1,
				},
				{ subscribe: true },
			);
			console.log(liveData1?.data?.discordId);

			expect(liveData1).toBe(liveData2);
			expect(liveData2).toBe(liveData3);

			expect(liveData1?.data?.discordId).toBe(discordId1);
			expect(liveData2?.data?.discordId).toBe(discordId1);
			expect(liveData3?.data?.discordId).toBe(discordId1);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("different args create different LiveData instances", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(server);
		yield* database.private.servers.upsertServer(server2);

		const liveData1 = yield* database.private.servers.getServerByDiscordId({
			discordId: discordId1,
		});
		const liveData2 = yield* database.private.servers.getServerByDiscordId({
			discordId: discordId2,
		});

		expect(liveData1).not.toBe(liveData2);

		expect(liveData1?.discordId).toBe(discordId1);
		expect(liveData2?.discordId).toBe(discordId2);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("different queries create different LiveData instances", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(server);

		const liveData1 = yield* database.private.servers.getServerByDiscordId({
			discordId: discordId1,
		});
		const liveData2 = yield* database.private.servers.getAllServers();

		expect(liveData1).not.toBe(liveData2);

		expect(liveData1?.discordId).toBe(discordId1);
		expect(Array.isArray(liveData2)).toBe(true);
		expect(liveData2?.length).toBeGreaterThan(0);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("reference counting: multiple acquisitions increment refCount", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(server);

		const scope1 = yield* Scope.make();
		const scope2 = yield* Scope.make();
		const scope3 = yield* Scope.make();

		const liveData1 = yield* Scope.extend(
			database.private.servers.getServerByDiscordId(
				{ discordId: discordId1 },
				{ subscribe: true },
			),
			scope1,
		);
		const liveData2 = yield* Scope.extend(
			database.private.servers.getServerByDiscordId(
				{ discordId: discordId1 },
				{ subscribe: true },
			),
			scope2,
		);
		const liveData3 = yield* Scope.extend(
			database.private.servers.getServerByDiscordId(
				{ discordId: discordId1 },
				{ subscribe: true },
			),
			scope3,
		);

		expect(liveData1).toBe(liveData2);
		expect(liveData2).toBe(liveData3);

		yield* Scope.close(scope1, Exit.succeed(undefined));

		expect(liveData2?.data?.discordId).toBe(discordId1);
		expect(liveData3?.data?.discordId).toBe(discordId1);

		yield* Scope.close(scope2, Exit.succeed(undefined));

		expect(liveData3?.data?.discordId).toBe(discordId1);

		yield* Scope.close(scope3, Exit.succeed(undefined));
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"updates propagate to all LiveData instances watching same query+args",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.private.servers.upsertServer(server);

			const liveData1 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId1,
				},
				{ subscribe: true },
			);
			const liveData2 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId1,
				},
				{ subscribe: true },
			);
			const liveData3 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId1,
				},
				{ subscribe: true },
			);

			expect(liveData1?.data?.description).toBe("Test Description");
			expect(liveData2?.data?.description).toBe("Test Description");
			expect(liveData3?.data?.description).toBe("Test Description");

			const updatedDescription = `Updated description ${Math.random()}`;
			yield* database.private.servers.upsertServer({
				...server,
				description: updatedDescription,
			});

			expect(liveData1?.data?.description).toBe(updatedDescription);
			expect(liveData2?.data?.description).toBe(updatedDescription);
			expect(liveData3?.data?.description).toBe(updatedDescription);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped(
	"updates only affect LiveData instances watching the affected query+args",
	() =>
		Effect.gen(function* () {
			const database = yield* Database;

			yield* database.private.servers.upsertServer(server);
			yield* database.private.servers.upsertServer(server2);

			const liveData1 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId1,
				},
				{ subscribe: true },
			);
			const liveData2 = yield* database.private.servers.getServerByDiscordId(
				{
					discordId: discordId2,
				},
				{ subscribe: true },
			);

			expect(liveData1?.data?.discordId).toBe(discordId1);
			expect(liveData2?.data?.discordId).toBe(discordId2);

			const updatedDescription = `Updated description ${Math.random()}`;
			yield* database.private.servers.upsertServer({
				...server,
				description: updatedDescription,
			});

			expect(liveData1?.data?.description).toBe(updatedDescription);
			expect(liveData2?.data?.description).toBe("Test Description 2");
			expect(liveData2?.data?.discordId).toBe(discordId2);
		}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData can be reacquired after cleanup", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(server);

		const scope1 = yield* Scope.make();

		const liveData1 = yield* Scope.extend(
			database.private.servers.getServerByDiscordId({ discordId: discordId1 }),
			scope1,
		);
		expect(liveData1?.discordId).toBe(discordId1);

		yield* Scope.close(scope1, Exit.succeed(undefined));

		const scope2 = yield* Scope.make();
		const liveData2 = yield* Scope.extend(
			database.private.servers.getServerByDiscordId({ discordId: discordId1 }),
			scope2,
		);

		expect(liveData2?.discordId).toBe(discordId1);

		expect(liveData1).not.toBe(liveData2);

		yield* Scope.close(scope2, Exit.succeed(undefined));
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getAllServers updates when any server changes", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(server);

		const liveData = yield* database.private.servers.getAllServers(undefined, {
			subscribe: true,
		});

		expect(liveData?.data?.length).toBe(1);
		expect(liveData?.data?.[0]?.discordId).toBe(discordId1);

		yield* database.private.servers.upsertServer(server2);

		expect(liveData?.data?.length).toBe(2);
		expect(liveData?.data?.some((s) => s.discordId === discordId1)).toBe(true);
		expect(liveData?.data?.some((s) => s.discordId === discordId2)).toBe(true);

		const updatedDescription = `Updated description ${Math.random()}`;
		yield* database.private.servers.upsertServer({
			...server,
			description: updatedDescription,
		});

		expect(liveData?.data?.length).toBe(2);
		const updatedServer = liveData?.data?.find(
			(s) => s.discordId === discordId1,
		);
		expect(updatedServer?.description).toBe(updatedDescription);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData handles queries with no args", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.private.servers.upsertServer(server);

		const liveData1 = yield* database.private.servers.getAllServers(undefined, {
			subscribe: true,
		});
		const liveData2 = yield* database.private.servers.getAllServers(undefined, {
			subscribe: true,
		});

		expect(liveData1).toBe(liveData2);

		expect(liveData1?.data?.length).toBe(1);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData handles null query results", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const nonexistentId = generateSnowflakeString();
		const liveData = yield* database.private.servers.getServerByDiscordId({
			discordId: nonexistentId,
		});

		expect(liveData).toBeNull();
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("LiveData updates when null result becomes non-null", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const newDiscordId = generateSnowflakeString();
		const liveData = yield* database.private.servers.getServerByDiscordId(
			{
				discordId: newDiscordId,
			},
			{ subscribe: true },
		);

		expect(liveData?.data).toBeNull();

		const newServer: Server = {
			...server,
			discordId: newDiscordId,
			name: "New Server",
		};
		yield* database.private.servers.upsertServer(newServer);

		expect(liveData?.data?.discordId).toBe(newDiscordId);
		expect(liveData?.data?.name).toBe("New Server");
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
			database.private.servers.getServerByDiscordId({ discordId: discordId1 }),
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
