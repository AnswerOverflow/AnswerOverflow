import { Context, Effect, Layer } from "effect";
import type { Server } from "../convex/schema.js";
import { ConvexClientHttpUnifiedLayer } from "./convex-client-http.js";
import {
  ConvexClientTestLayer,
  ConvexClientTestUnifiedLayer,
} from "./convex-client-test.js";
import { ConvexClientUnified } from "./convex-unified-client.js";

const service = Effect.gen(function* () {
  const externalSecret = "hello"; //yield* Config.string("EXTERNAL_WRITE_SECRET");
  const convexClient = yield* ConvexClientUnified;

  const upsertServer = (data: Server) =>
    convexClient.use((client, { api }) =>
      client.mutation(api.servers.upsertServerExternal, {
        data,
        apiKey: externalSecret,
      })
    );

  const getServerById = (discordId: string) =>
    convexClient.use((client, { api }) =>
      client.query(api.servers.publicGetServerByDiscordId, {
        discordId,
      })
    );

  return {
    servers: {
      upsertServer,
      getServerById,
    },
  };
});

export class Database extends Context.Tag("Database")<
  Database,
  Effect.Effect.Success<typeof service>
>() {}

export const DatabaseLayer = Layer.effect(Database, service).pipe(
  Layer.provide(ConvexClientHttpUnifiedLayer)
);

export const DatabaseTestLayer = Layer.merge(
  Layer.effect(Database, service).pipe(
    Layer.provide(ConvexClientTestUnifiedLayer)
  ),
  ConvexClientTestLayer
);
