import type {
  FunctionArgs,
  FunctionReference,
  FunctionReturnType,
  OptionalRestArgs,
} from "convex/server";
import { getFunctionName } from "convex/server";
import { Context, Effect, Exit, Layer, Request, RequestResolver } from "effect";
import { api, internal } from "../convex/_generated/api";
import type { Server } from "../convex/schema";
import { ConvexClientHttpUnifiedLayer } from "./convex-client-http";
import {
  ConvexClientTestLayer,
  ConvexClientTestUnifiedLayer,
} from "./convex-client-test";
import type { ConvexClientShared } from "./convex-unified-client";
import { ConvexClientUnified } from "./convex-unified-client";

export class LiveData<T> {
  private _data: T | undefined;
  private unsubscribe: (() => void) | undefined;

  constructor(
    getCurrentValue: () => T | undefined,
    onUpdate: (callback: () => void) => () => void,
    initialData?: T
  ) {
    this._data = initialData ?? getCurrentValue();

    // Set up automatic updates
    this.unsubscribe = onUpdate(() => {
      const newData = getCurrentValue();
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

// Request type for watch subscriptions
interface WatchRequest<Query extends FunctionReference<"query">>
  extends Request.Request<LiveData<FunctionReturnType<Query>>, never> {
  readonly _tag: "WatchRequest";
  readonly query: Query;
  readonly args: FunctionArgs<Query>;
  readonly cacheKey: string;
}

// WeakMap to store cache keys for LiveData instances
const liveDataCacheKeys = new WeakMap<LiveData<unknown>, string>();

// Helper to create a watch request
const watchRequest = <Query extends FunctionReference<"query">>(
  query: Query,
  args: FunctionArgs<Query>
): WatchRequest<Query> => {
  const functionName = getFunctionName(query);
  const cacheKey = JSON.stringify({ functionName, args });
  return Request.tagged<WatchRequest<Query>>("WatchRequest")({
    query,
    args,
    cacheKey,
  });
};

// Helper to extract args from OptionalRestArgs
// When args is empty, FunctionArgs<Query> must be {} for queries with no args
const extractArgs = <Query extends FunctionReference<"query">>(
  args: OptionalRestArgs<Query>
): FunctionArgs<Query> => {
  // Handle the case where args is provided
  if (args.length > 0 && args[0] !== undefined) {
    return args[0];
  }
  // When args is empty, FunctionArgs<Query> must be {} for queries with no args
  // We use a helper function to ensure type safety
  return getEmptyFunctionArgs<Query>();
};

// Helper function that returns empty args for queries with no arguments
// This is type-safe because when Query has no args, FunctionArgs<Query> = {}
function getEmptyFunctionArgs<
  Query extends FunctionReference<"query">,
>(): FunctionArgs<Query> {
  // Create an empty object that satisfies the FunctionArgs<Query> type
  // when Query has no arguments
  const empty: Record<string, never> = {};
  // TypeScript requires this to be FunctionArgs<Query>, and when Query has no args,
  // FunctionArgs<Query> is {}, so this assignment is valid
  return empty satisfies FunctionArgs<Query>;
}

const service = Effect.gen(function* () {
  const externalSecret = "hello"; //yield* Config.string("EXTERNAL_WRITE_SECRET");
  const convexClient = yield* ConvexClientUnified;

  // Map to store active watches and their reference counts
  // Runtime type safety is guaranteed by the cache key (function name + args)
  // TypeScript can't express heterogeneous maps without wider types, so we accept
  // that the stored value is a LiveData with some result type
  type ActiveWatch<
    T extends FunctionReturnType<
      FunctionReference<"query">
    > = FunctionReturnType<FunctionReference<"query">>,
  > = {
    liveData: LiveData<T>;
    unsubscribe: () => void;
    refCount: number;
  };
  const activeWatches = new Map<string, ActiveWatch>();

  const upsertServer = (data: Server) =>
    convexClient.use(
      (
        client: ConvexClientShared,
        convexApi: { api: typeof api; internal: typeof internal }
      ) =>
        client.mutation(convexApi.api.servers.upsertServerExternal, {
          data,
          apiKey: externalSecret,
        })
    );

  // Create a resolver for watch requests
  const watchResolver = RequestResolver.makeBatched(
    (requests: ReadonlyArray<WatchRequest<FunctionReference<"query">>>) =>
      Effect.gen(function* () {
        // Process each request
        for (const request of requests) {
          const { query, args, cacheKey } = request;

          // Check if we already have an active watch for this key
          const existing = activeWatches.get(cacheKey);
          if (existing) {
            existing.refCount++;
            // The cache key (function name + args) guarantees the stored LiveData
            // has the correct type for this request at runtime
            yield* Request.complete(request, Exit.succeed(existing.liveData));
            continue;
          }

          // Create new watch
          const callbacks = new Set<() => void>();
          let currentValue: FunctionReturnType<typeof query> | undefined;

          // Use orDie to convert errors to defects since the resolver doesn't support typed errors
          const unsubscribe = yield* convexClient
            .use((client: ConvexClientShared) => {
              return client.onUpdate(query, args, (result) => {
                currentValue = result;
                callbacks.forEach((cb) => cb());
              });
            })
            .pipe(Effect.orDie);

          const liveData = new LiveData<FunctionReturnType<typeof query>>(
            () => currentValue,
            (callback) => {
              callbacks.add(callback);
              return () => {
                callbacks.delete(callback);
              };
            },
            currentValue
          );

          // Store in active watches
          activeWatches.set(cacheKey, {
            liveData,
            unsubscribe,
            refCount: 1,
          });

          yield* Request.complete(request, Exit.succeed(liveData));
        }
      })
  ).pipe(
    // Enable caching and deduplication
    RequestResolver.contextFromServices(ConvexClientUnified)
  );

  const watchQueryToLiveData = <Query extends FunctionReference<"query">>(
    getQuery: (convexApi: {
      api: typeof api;
      internal: typeof internal;
    }) => Query,
    ...args: OptionalRestArgs<Query>
  ) => {
    return Effect.acquireRelease(
      Effect.gen(function* () {
        const query = getQuery({ api, internal });
        // Handle optional rest args - could be [] or [FunctionArgs<Query>]
        const queryArgs = extractArgs(args);
        const request = watchRequest(query, queryArgs);

        // Use the resolver with the request - deduplication happens automatically
        const liveData = yield* Effect.request(request, watchResolver);

        // Store cache key in WeakMap for cleanup
        liveDataCacheKeys.set(liveData, request.cacheKey);

        return liveData;
      }),
      (liveData) =>
        Effect.sync(() => {
          const cacheKey = liveDataCacheKeys.get(liveData);
          if (cacheKey) {
            const watch = activeWatches.get(cacheKey);
            if (watch) {
              watch.refCount--;
              if (watch.refCount === 0) {
                watch.unsubscribe();
                activeWatches.delete(cacheKey);
              }
            }
            liveDataCacheKeys.delete(liveData);
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

export const DatabaseTestLayer = Layer.mergeAll(
  Layer.effect(Database, service).pipe(
    Layer.provide(ConvexClientTestUnifiedLayer)
  ),
  ConvexClientTestLayer
);
