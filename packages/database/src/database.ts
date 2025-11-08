import { Context, Effect, Layer } from "effect";
import type { Server } from "../convex/schema";
import { ConvexClientHttpUnifiedLayer } from "./convex-client-http";
import {
  ConvexClientTestLayer,
  ConvexClientTestUnifiedLayer,
} from "./convex-client-test";
import { ConvexClientUnified } from "./convex-unified-client";

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
    convexClient.use((client, { api }) => {
      client
        .watchQuery(api.servers.publicGetServerByDiscordId, {
          discordId,
        })
        .onUpdate(() => {
          console.log("Server updated");
        });
    });

  const publicGetAllServers = () =>
    convexClient.use((client, { api }) =>
      client.query(api.servers.publicGetAllServers)
    );

  return {
    servers: {
      upsertServer,
      getServerById,
      publicGetAllServers,
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
