import { Effect, Schedule } from "effect";
import type { Server } from "../convex/schema";
import { Database, DatabaseTestLayer } from "../src/database";

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
const make = Effect.gen(function* () {
  const database = yield* Database;

  yield* database.servers.upsertServer(server);

  const created = yield* database.servers.getServerById("123");

  // Run upsert after 500ms without blocking
  yield* Effect.fork(
    Effect.sleep("500 millis")
      .pipe(
        Effect.flatMap(() => {
          console.log("upserting server");
          return database.servers.upsertServer({
            ...server,
            description: `A brand new description ${Math.random()}`,
          });
        })
      )
      .pipe(Effect.repeat(Schedule.spaced("500 millis")))
  );

  yield* Effect.log(created).pipe(
    Effect.repeat(
      Schedule.intersect(Schedule.spaced("500 millis"), Schedule.recurs(5))
    )
  );
}).pipe(Effect.provide(DatabaseTestLayer));

Effect.runPromise(make);
