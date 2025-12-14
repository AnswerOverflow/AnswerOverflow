import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
	OptionalRestArgs,
} from "convex/server";
import { getFunctionName } from "convex/server";
import type { Value } from "convex/values";
import { convexToJson } from "convex/values";
import { Cache, Duration, Effect } from "effect";
import type { WrappedUnifiedClient } from "./convex-unified-client";
import { LiveData } from "./live-data";

const isDevelopment = process.env.NODE_ENV === "development";

const extractArgs = <Query extends FunctionReference<"query">>(
	args: OptionalRestArgs<Query>,
): FunctionArgs<Query> => (args[0] ?? {}) as FunctionArgs<Query>;

const createCacheKey = <Query extends FunctionReference<"query">>(
	query: Query,
	args: FunctionArgs<Query>,
): string => {
	const functionName = getFunctionName(query);
	return JSON.stringify({
		functionName,
		args: convexToJson(args as unknown as Value),
	});
};

type CachedWatch<Query extends FunctionReference<"query">> = {
	liveData: LiveData<FunctionReturnType<Query>>;
	unsubscribe: () => void;
};

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
	const lookupContexts = new Map<string, LookupContext>();

	const cache = Effect.gen(function* () {
		return yield* Cache.make({
			capacity: isDevelopment ? 0 : 100,
			timeToLive: isDevelopment ? Duration.zero : Duration.minutes(5),
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
