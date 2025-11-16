import { expect, it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import type { Id } from "../convex/_generated/dataModel";
import type { Server } from "../convex/schema";
import { Database } from "./database";
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

it.scoped("findManyServersById returns multiple servers", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);
		yield* database.servers.upsertServer(server2);

		const server1LiveData = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});
		const server2LiveData = yield* database.servers.getServerByDiscordId({
			discordId: "456",
		});

		const server1Id = server1LiveData?._id;
		const server2Id = server2LiveData?._id;

		if (!server1Id || !server2Id) {
			throw new Error("Servers not found");
		}

		const liveData = yield* database.servers.findManyServersById({
			ids: [server1Id, server2Id],
		});

		expect(liveData?.length).toBe(2);
		expect(liveData?.some((s) => s.discordId === "123")).toBe(true);
		expect(liveData?.some((s) => s.discordId === "456")).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getBiggestServers returns servers ordered by member count", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const serverSmall: Server = {
			...server,
			discordId: "small",
			approximateMemberCount: 10,
		};
		const serverMedium: Server = {
			...server2,
			discordId: "medium",
			approximateMemberCount: 100,
		};
		const serverLarge: Server = {
			...server,
			discordId: "large",
			approximateMemberCount: 1000,
		};

		yield* database.servers.upsertServer(serverSmall);
		yield* database.servers.upsertServer(serverMedium);
		yield* database.servers.upsertServer(serverLarge);

		const liveData = yield* database.servers.getBiggestServers({ take: 2 });

		expect(liveData?.length).toBe(2);
		expect(liveData?.[0]?.discordId).toBe("large");
		expect(liveData?.[1]?.discordId).toBe("medium");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createServer creates new server", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const newServer: Server = {
			...server,
			discordId: "new123",
			name: "New Server",
		};

		yield* database.servers.createServer(newServer);

		const liveData = yield* database.servers.getServerByDiscordId({
			discordId: "new123",
		});

		expect(liveData?.discordId).toBe("new123");
		expect(liveData?.name).toBe("New Server");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateServer updates existing server", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.upsertServer(server);

		const serverLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});
		const serverId = serverLiveData?._id;

		if (!serverId) {
			throw new Error("Server not found");
		}

		const updatedServer: Server = {
			...server,
			name: "Updated Server Name",
			description: "Updated Description",
		};
		yield* database.servers.updateServer({ id: serverId, data: updatedServer });

		const updatedLiveData = yield* database.servers.getServerByDiscordId({
			discordId: "123",
		});

		expect(updatedLiveData?.name).toBe("Updated Server Name");
		expect(updatedLiveData?.description).toBe("Updated Description");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("getBiggestServers updates when member counts change", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const serverA: Server = {
			...server,
			discordId: "serverA",
			approximateMemberCount: 100,
		};
		const serverB: Server = {
			...server2,
			discordId: "serverB",
			approximateMemberCount: 200,
		};

		yield* database.servers.upsertServer(serverA);
		yield* database.servers.upsertServer(serverB);

		const liveData = yield* database.servers.getBiggestServers(
			{ take: 2 },
			{ subscribe: true },
		);

		expect(liveData?.data?.length).toBe(2);
		expect(liveData?.data?.[0]?.discordId).toBe("serverB");
		expect(liveData?.data?.[1]?.discordId).toBe("serverA");

		const serverALiveData = yield* database.servers.getServerByDiscordId({
			discordId: "serverA",
		});
		const serverAId = serverALiveData?._id;

		if (!serverAId) {
			throw new Error("Server not found");
		}

		const updatedServerA: Server = {
			...serverA,
			approximateMemberCount: 300,
		};
		yield* database.servers.updateServer({
			id: serverAId,
			data: updatedServerA,
		});

		expect(liveData?.data?.[0]?.discordId).toBe("serverA");
		expect(liveData?.data?.[1]?.discordId).toBe("serverB");
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("findManyServersById handles partial updates correctly", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const server1: Server = { ...server, discordId: "s1" };
		const server2Test: Server = { ...server2, discordId: "s2" };
		const server3: Server = {
			...server,
			discordId: "s3",
			name: "Server 3",
		};

		yield* database.servers.upsertServer(server1);
		yield* database.servers.upsertServer(server2Test);
		yield* database.servers.upsertServer(server3);

		const s1Live = yield* database.servers.getServerByDiscordId({
			discordId: "s1",
		});
		const s2Live = yield* database.servers.getServerByDiscordId({
			discordId: "s2",
		});
		const s3Live = yield* database.servers.getServerByDiscordId({
			discordId: "s3",
		});

		const s1Id = s1Live?._id;
		const s2Id = s2Live?._id;
		const s3Id = s3Live?._id;

		if (!s1Id || !s2Id || !s3Id) {
			throw new Error("Servers not found");
		}

		const liveData = yield* database.servers.findManyServersById(
			{
				ids: [s1Id, s2Id, s3Id],
			},
			{ subscribe: true },
		);

		expect(liveData?.data?.length).toBe(3);

		const updatedS1: Server = {
			...server1,
			name: "Updated Server 1",
		};
		yield* database.servers.updateServer({ id: s1Id, data: updatedS1 });

		const updatedServer = liveData?.data?.find((s) => s._id === s1Id);
		expect(updatedServer?.name).toBe("Updated Server 1");
		expect(liveData?.data?.length).toBe(3);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("createServer throws error if server already exists", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		yield* database.servers.createServer(server);

		const result = yield* database.servers
			.createServer(server)
			.pipe(Effect.exit);

		expect(Exit.isFailure(result)).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);

it.scoped("updateServer throws error if server does not exist", () =>
	Effect.gen(function* () {
		const database = yield* Database;

		const fakeId = "j9z8y7x6w5v4u3t2s1r0q" as Id<"servers">;
		const result = yield* database.servers
			.updateServer({ id: fakeId, data: server })
			.pipe(Effect.exit);

		expect(Exit.isFailure(result)).toBe(true);
	}).pipe(Effect.provide(DatabaseTestLayer)),
);
