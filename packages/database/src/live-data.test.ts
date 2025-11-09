import { expect, it } from "@effect/vitest";
import { Effect, Schedule, TestClock } from "effect";
import type { Server } from "../convex/schema";
import { ConvexClientTest } from "./convex-client-test";
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

it.effect("live data updates when server is modified", () =>
  Effect.gen(function* () {
    const database = yield* Database;
    const testClient = yield* ConvexClientTest;

    // Initial upsert
    yield* database.servers.upsertServer(server);
    yield* testClient.use((client) => {
      client.finishInProgressScheduledFunctions();
    });

    // Get live data
    const liveData = yield* database.servers.getServerById("123");

    // Ensure any pending queries complete
    yield* testClient.use((client) => {
      client.finishInProgressScheduledFunctions();
    });

    // Advance time to allow setTimeout callbacks to fire
    yield* TestClock.adjust("10 millis");

    // Wait for initial data to load (the query runs asynchronously)
    yield* Effect.retry(
      Effect.sync(() => {
        if (liveData?.data === undefined) {
          throw new Error("Data not loaded yet");
        }
      }),
      {
        times: 20,
        schedule: Schedule.spaced("100 millis"),
      }
    );

    expect(liveData?.data?.discordId).toBe("123");
    expect(liveData?.data?.description).toBe("Test Description");

    // Update the server
    const updatedDescription = `A brand new description ${Math.random()}`;
    yield* database.servers.upsertServer({
      ...server,
      description: updatedDescription,
    });
    yield* testClient.use((client) => {
      client.finishInProgressScheduledFunctions();
    });

    // Advance time to allow setTimeout callbacks to fire
    yield* TestClock.adjust("10 millis");

    // Wait for update to propagate
    yield* Effect.retry(
      Effect.sync(() => {
        if (liveData?.data?.description !== updatedDescription) {
          throw new Error("Update not propagated yet");
        }
      }),
      {
        times: 10,
        schedule: Schedule.spaced("50 millis"),
      }
    );

    // Verify live data has updated
    expect(liveData?.data?.description).toBe(updatedDescription);
    expect(liveData?.data?.discordId).toBe("123");

    // Clean up
    liveData?.destroy();
  }).pipe(Effect.provide(DatabaseTestLayer))
);
