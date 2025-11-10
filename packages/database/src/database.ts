import type { FunctionReference, FunctionReturnType, OptionalRestArgs } from "convex/server";
import { Context, Effect, Layer } from "effect";
import type { api, internal } from "../convex/_generated/api";
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

// Cached watch entry with reference count
type CachedWatch<T> = {
  watch: Watch<T>;
  refCount: number;
};

const service = Effect.gen(function* () {
  const externalSecret = "hello"; //yield* Config.string("EXTERNAL_WRITE_SECRET");
  const convexClient = yield* ConvexClientUnified;

  // Watch cache: maps query function + serialized args to cached watch
  // Using a composite key: query function reference object + JSON stringified args
  // We use a Map with a composite key object
  type CacheKey = {
    query: FunctionReference<"query">;
    argsKey: string;
  };
  const watchCache = new Map<CacheKey, CachedWatch<unknown>>();

  // Helper to create a cache key from query and args
  const createCacheKey = <Query extends FunctionReference<"query">>(
    query: Query,
    args: OptionalRestArgs<Query>
  ): CacheKey => {
    // Use the query function reference object itself + serialized args
    // Function references are stable objects, so we can use them directly as keys
    const argsKey = JSON.stringify(args[0] ?? {});
    return { query, argsKey };
  };

  const upsertServer = (data: Server) =>
    convexClient.use((client, { api }) =>
      client.mutation(
        (api.servers as { upsertServerExternal: FunctionReference<"mutation"> })
          .upsertServerExternal,
        {
          data,
          apiKey: externalSecret,
        }
      )
    );

  const watchQueryToLiveData = <Query extends FunctionReference<"query">>(
    getQuery: (convexApi: {
      api: typeof api;
      internal: typeof internal;
    }) => Query,
    ...args: OptionalRestArgs<Query>
  ) => {
    // Capture cache key creation parameters in closure
    const getCacheKey = (convexApi: {
      api: typeof api;
      internal: typeof internal;
    }): CacheKey => {
      const query = getQuery(convexApi);
      return createCacheKey(query, args);
    };

    return Effect.acquireRelease(
      convexClient.use(async (client, convexApi): Promise<LiveData<FunctionReturnType<Query>>> => {
        const cacheKey = getCacheKey(convexApi);

        // Check if watch is already cached
        const cached = watchCache.get(cacheKey) as
          | CachedWatch<FunctionReturnType<Query>>
          | undefined;

        let watch: Watch<FunctionReturnType<Query>>;
        if (cached) {
          // Reuse existing watch and increment ref count
          cached.refCount++;
          watch = cached.watch as Watch<FunctionReturnType<Query>>;
        } else {
          // Create new watch and cache it
          const query = getQuery(convexApi);
          watch = await client.watchQuery(query, ...args);
          watchCache.set(cacheKey, {
            watch: watch as Watch<unknown>,
            refCount: 1,
          });
        }

        // Store cache key with LiveData for cleanup
        const liveData = new LiveData(watch);
        (liveData as LiveData<FunctionReturnType<Query>> & { _cacheKey: CacheKey })._cacheKey = cacheKey;
        return liveData;
      }),
      (liveData) =>
        Effect.sync(() => {
          // Decrement ref count and cleanup if no longer needed
          const cacheKey = (liveData as LiveData<unknown> & { _cacheKey?: CacheKey })._cacheKey;
          if (cacheKey) {
            const cached = watchCache.get(cacheKey);
            if (cached) {
              cached.refCount--;
              if (cached.refCount === 0) {
                watchCache.delete(cacheKey);
              }
            }
          }
          liveData.destroy();
        })
    );
  };

  const getServerById = (discordId: string) =>
    watchQueryToLiveData(({ api }) => api.servers.publicGetServerByDiscordId, {
      discordId,
    });

  const publicGetAllServers = () =>
    watchQueryToLiveData(({ api }) => api.servers.publicGetAllServers, {});

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
