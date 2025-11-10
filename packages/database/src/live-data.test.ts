import { expect, it } from "@effect/vitest";
import { Effect, TestClock } from "effect";
import type { Server } from "../convex/schema";
import { Database, DatabaseTestLayer } from "./database";

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

it.scoped("live data updates when server is modified", () =>
  Effect.gen(function* () {
    const database = yield* Database;

    // Initial upsert
    yield* database.servers.upsertServer(server);

    // Get live data
    const liveData = yield* database.servers.getServerById("123");

    // Advance time to allow setTimeout callbacks to fire
    yield* TestClock.adjust("10 millis");

    // Data should already be loaded due to defer mechanism
    expect(liveData?.data?.discordId).toBe("123");
    expect(liveData?.data?.description).toBe("Test Description");

    // Update the server
    const updatedDescription = `A brand new description ${Math.random()}`;
    yield* database.servers.upsertServer({
      ...server,
      description: updatedDescription,
    });

    // Advance time to allow setTimeout callbacks to fire
    yield* TestClock.adjust("10 millis");

    // Verify live data has updated
    expect(liveData?.data?.description).toBe(updatedDescription);
    expect(liveData?.data?.discordId).toBe("123");
  }).pipe(Effect.provide(DatabaseTestLayer))
);
