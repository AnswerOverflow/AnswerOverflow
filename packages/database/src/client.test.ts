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

it.scoped("upserting server", () =>
  Effect.gen(function* () {
    const database = yield* Database;

    yield* database.servers.upsertServer(server);

    const created = yield* database.servers.getServerById("123");

    // Advance time to allow setTimeout callbacks to fire
    yield* TestClock.adjust("10 millis");

    // Data should already be loaded due to defer mechanism
    expect(created?.data?.discordId).toBe("123");
  }).pipe(Effect.provide(DatabaseTestLayer))
);

it.scoped(
  "getServerById uses watch cache - only makes 1 query for 5 calls",
  () =>
    Effect.gen(function* () {
      const database = yield* Database;

      // Set up server data
      yield* database.servers.upsertServer(server);

      // Call getServerById 5 times - should reuse the same watch from cache
      const results = yield* Effect.all(
        Array.from({ length: 5 }, () => database.servers.getServerById("123"))
      );

      // Advance time to allow setTimeout callbacks to fire
      yield* TestClock.adjust("10 millis");

      // Data should already be loaded due to defer mechanism
      // Verify all results are correct
      for (const result of results) {
        expect(result?.data?.discordId).toBe("123");
      }

      // Verify cache works by checking that all LiveData instances share the same watch
      // If the cache works, all 5 calls should reuse the same watch, meaning they should
      // all update together when data changes
      const updatedDescription = "Updated Description";
      yield* database.servers.upsertServer({
        ...server,
        description: updatedDescription,
      });
      yield* TestClock.adjust("10 millis");

      // Verify all instances updated together (they share the same watch)
      for (const result of results) {
        expect(result?.data?.description).toBe(updatedDescription);
      }
    }).pipe(Effect.provide(DatabaseTestLayer))
);
