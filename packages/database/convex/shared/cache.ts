import { Effect, Option } from "effect";

/**
 * In-memory cache for V8 isolate runtime compatibility.
 * Redis/Valkey requires TCP sockets which aren't available in V8 isolate.
 * This provides a simple in-memory cache that works within the same function execution.
 *
 * Note: This cache is per-function-execution and doesn't persist across invocations.
 * For persistent caching, use a Convex query/mutation with database storage,
 * or keep the Redis-based cache in a separate file with "use node".
 */
const memoryCache = new Map<string, { value: unknown; expiresAt: number }>();

function getCachedFromMemory<T>(key: string): Option.Option<T> {
	const cached = memoryCache.get(key);
	if (!cached) {
		return Option.none();
	}

	if (Date.now() > cached.expiresAt) {
		memoryCache.delete(key);
		return Option.none();
	}

	try {
		return Option.some(cached.value as T);
	} catch {
		memoryCache.delete(key);
		return Option.none();
	}
}

function setCachedInMemory<T>(key: string, value: T, ttlSeconds: number): void {
	memoryCache.set(key, {
		value,
		expiresAt: Date.now() + ttlSeconds * 1000,
	});
}

export function getCached<T>(
	key: string,
): Effect.Effect<Option.Option<T>, Error> {
	return Effect.succeed(getCachedFromMemory<T>(key));
}

export function setCached<T>(
	key: string,
	value: T,
	ttlSeconds: number = 300,
): Effect.Effect<void, Error> {
	return Effect.gen(function* () {
		setCachedInMemory(key, value, ttlSeconds);
	});
}

export function getOrSetCache<T, E = never>(
	key: string,
	fetcher: () => Effect.Effect<T, E>,
	ttlSeconds: number = 300,
): Effect.Effect<T, E> {
	return Effect.gen(function* () {
		// Try to get from cache, but don't fail if caching is unavailable
		const cached = yield* getCached<T>(key).pipe(
			Effect.catchAll(() => Effect.succeed(Option.none<T>())),
		);
		if (Option.isSome(cached)) {
			return cached.value;
		}

		// Fetch the value (this can fail with E)
		const value = yield* fetcher();

		// Try to cache it, but don't fail if caching is unavailable
		yield* setCached(key, value, ttlSeconds).pipe(
			Effect.catchAll(() => Effect.void),
		);

		return value;
	});
}
