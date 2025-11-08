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

  // Print the created value every 500ms
  yield* Effect.log(created).pipe(Effect.repeat(Schedule.spaced("500 millis")));
}).pipe(Effect.provide(DatabaseTestLayer));

Effect.runPromise(make);
