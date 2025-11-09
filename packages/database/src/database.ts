import { Context, Effect, Layer } from "effect";
import type { Server } from "../convex/schema";
import { ConvexClientHttpUnifiedLayer } from "./convex-client-http";
import {
  ConvexClientTestLayer,
  ConvexClientTestUnifiedLayer,
} from "./convex-client-test";
import { ConvexClientUnified, type Watch } from "./convex-unified-client";

export class LiveData<T> {
  private _data: T | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(watch: Watch<T>, initialData?: T) {
    this._data = initialData ?? watch.localQueryResult();

    // Set up automatic updates
    this.unsubscribe = watch.onUpdate(() => {
      const newData = watch.localQueryResult();
      if (newData !== undefined) {
        this._data = newData;
      }
    });
  }

  get data(): T | undefined {
    return this._data;
  }

  destroy(): void {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = undefined;
    }
  }
}

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
      const watch = client.watchQuery(api.servers.publicGetServerByDiscordId, {
        discordId,
      });
      return new LiveData(watch);
    });

  const publicGetAllServers = () =>
    convexClient.use((client, { api }) => {
      const watch = client.watchQuery(api.servers.publicGetAllServers, {});
      return new LiveData(watch);
    });

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
