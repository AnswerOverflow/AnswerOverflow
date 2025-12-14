import type {
	FunctionArgs,
	FunctionReference,
	FunctionReturnType,
	OptionalRestArgs,
} from "convex/server";
import { getFunctionName } from "convex/server";
import { Effect, Exit, Request, RequestResolver } from "effect";
import type {
	ConvexError,
	WrappedUnifiedClient,
} from "./convex-unified-client";
import { LiveData } from "./live-data";

interface WatchRequest<Query extends FunctionReference<"query">>
	extends Request.Request<LiveData<FunctionReturnType<Query>>, ConvexError> {
	readonly _tag: "WatchRequest";
	readonly query: Query;
	readonly args: FunctionArgs<Query>;
	readonly cacheKey: string;
}

const liveDataCacheKeys = new WeakMap<LiveData<unknown>, string>();

const watchRequest = <Query extends FunctionReference<"query">>(
	query: Query,
	args: FunctionArgs<Query>,
): WatchRequest<Query> => {
	const functionName = getFunctionName(query);
	const cacheKey = JSON.stringify({ functionName, args });
	return Request.tagged<WatchRequest<Query>>("WatchRequest")({
		query,
		args,
		cacheKey,
	});
};

const extractArgs = <Query extends FunctionReference<"query">>(
	args: OptionalRestArgs<Query>,
): FunctionArgs<Query> => (args[0] ?? {}) as FunctionArgs<Query>;

type ActiveWatch = {
	liveData: LiveData<FunctionReturnType<FunctionReference<"query">>>;
	unsubscribe: () => void;
	refCount: number;
};

export const createWatchQueryToLiveData = <
	Api extends { [key: string]: unknown },
	Internal extends { [key: string]: unknown },
>(
	wrappedClient: WrappedUnifiedClient,
	convexApi: { api: Api; internal: Internal },
) => {
	const activeWatches = new Map<string, ActiveWatch>();

	const watchResolver = RequestResolver.makeBatched(
		(requests: ReadonlyArray<WatchRequest<FunctionReference<"query">>>) =>
			Effect.gen(function* () {
				for (const request of requests) {
					const { query, args, cacheKey } = request;

					const existing = activeWatches.get(cacheKey);
					if (existing) {
						existing.refCount++;
						yield* Request.complete(request, Exit.succeed(existing.liveData));
						continue;
					}

					const result = yield* Effect.suspend(() =>
						Effect.gen(function* () {
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

							activeWatches.set(cacheKey, {
								liveData,
								unsubscribe,
								refCount: 1,
							});

							return liveData;
						}),
					).pipe(Effect.exit);

					yield* Request.complete(request, result);
				}
			}),
	);

	const watchQueryToLiveData = <Query extends FunctionReference<"query">>(
		getQuery: (convexApi: { api: Api; internal: Internal }) => Query,
		...args: OptionalRestArgs<Query>
	) => {
		return Effect.acquireRelease(
			Effect.gen(function* () {
				const query = getQuery(convexApi);
				const queryArgs = extractArgs(args);
				const request = watchRequest(query, queryArgs);

				const liveData = yield* Effect.request(request, watchResolver);

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
				}),
		);
	};

	return watchQueryToLiveData;
};
