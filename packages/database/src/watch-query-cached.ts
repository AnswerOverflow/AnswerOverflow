import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
	OptionalRestArgs,
} from "convex/server";
import { getFunctionName } from "convex/server";
import { Cache, Duration, Effect } from "effect";
import type { WrappedUnifiedClient } from "./convex-unified-client";
import { LiveData } from "./live-data";

// Helper to extract args from OptionalRestArgs
// When args is empty, returns {} for queries with no args
const extractArgs = <Query extends FunctionReference<"query">>(
	args: OptionalRestArgs<Query>,
): FunctionArgs<Query> => (args[0] ?? {}) as FunctionArgs<Query>;

// Helper to create a cache key from query and args
const createCacheKey = <Query extends FunctionReference<"query">>(
	query: Query,
	args: FunctionArgs<Query>,
): string => {
	const functionName = getFunctionName(query);
	return JSON.stringify({ functionName, args });
};

// Type for cached watch entry
type CachedWatch<Query extends FunctionReference<"query">> = {
	liveData: LiveData<FunctionReturnType<Query>>;
	unsubscribe: () => void;
};

// Type for lookup context - stores query and args for cache lookup
type LookupContext = {
	query: FunctionReference<"query">;
	args: FunctionArgs<FunctionReference<"query">>;
};

export const createWatchQueryToLiveData = <
	Api extends { [key: string]: unknown },
	Internal extends { [key: string]: unknown },
>(
	wrappedClient: WrappedUnifiedClient,
	convexApi: { api: Api; internal: Internal },
) => {
	// Map to store lookup contexts for cache keys
	// This allows us to reconstruct the query reference during cache lookup
	const lookupContexts = new Map<string, LookupContext>();

	// Capacity: 100 entries, TTL: 1 hour (entries will be evicted when capacity is reached or TTL expires)
	// Note: When entries are automatically evicted, their unsubscribe functions won't be called.
	// This is a limitation of Effect's Cache API which doesn't provide eviction hooks.
	// Subscriptions will remain active until TTL expires, but this is bounded and acceptable.
	const cache = Effect.gen(function* () {
		return yield* Cache.make({
			capacity: 100,
			timeToLive: Duration.hours(1),
			lookup: (cacheKey: string) =>
				Effect.gen(function* () {
					const context = lookupContexts.get(cacheKey);
					if (!context) {
						throw new Error(`Lookup context not found for key: ${cacheKey}`);
					}

					const { query, args } = context;

					const callbacks = new Set<() => void>();
					let currentValue: FunctionReturnType<typeof query> | undefined;

					currentValue = yield* wrappedClient.use((client) => {
						return client.query(query, args);
					});

					const unsubscribe = yield* wrappedClient.use((client) => {
						return client.onUpdate(query, args, (result) => {
							currentValue = result;
							callbacks.forEach((cb) => cb());
						});
					});

					const liveData = new LiveData<FunctionReturnType<typeof query>>(
						() => currentValue,
						(callback) => {
							callbacks.add(callback);
							return () => {
								callbacks.delete(callback);
							};
						},
						currentValue,
					);

					return {
						liveData,
						unsubscribe,
					} as CachedWatch<typeof query>;
				}),
		});
	}).pipe(Effect.runSync);

	const watchQueryToLiveData = <Query extends FunctionReference<"query">>(
		getQuery: (convexApi: { api: Api; internal: Internal }) => Query,
		...args: OptionalRestArgs<Query>
	) => {
		return Effect.gen(function* () {
			const query = getQuery(convexApi);
			const queryArgs = extractArgs(args);
			const cacheKey = createCacheKey(query, queryArgs);

			// Store lookup context if not already stored
			if (!lookupContexts.has(cacheKey)) {
				lookupContexts.set(cacheKey, {
					query: query as FunctionReference<"query">,
					args: queryArgs as FunctionArgs<FunctionReference<"query">>,
				});
			}

			const cached = yield* cache.get(cacheKey);

			return cached.liveData;
		});
	};

	return watchQueryToLiveData;
};
