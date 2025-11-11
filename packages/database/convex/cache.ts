"use node";

import Redis from "ioredis";
import { Effect, Option } from "effect";

let redisClient: Redis | null = null;

function getRedisClient(): Effect.Effect<Redis, Error> {
	return Effect.gen(function* () {
		if (redisClient) {
			return redisClient;
		}

		const valkeyUrl = process.env.VALKEY_URL;
		if (!valkeyUrl) {
			return yield* Effect.fail(
				new Error("VALKEY_URL environment variable is not set"),
			);
		}

		const client = new Redis(valkeyUrl);
		redisClient = client;

		// Handle connection errors
		client.on("error", (err) => {
			console.error("Valkey connection error:", err);
		});

		return client;
	});
}

export function getCached<T>(
	key: string,
): Effect.Effect<Option.Option<T>, Redis.CommandError | Error> {
	return Effect.gen(function* () {
		const client = yield* getRedisClient();
		const cached = yield* Effect.tryPromise({
			try: () => client.get(key),
			catch: (error) => error as Redis.CommandError,
		});

		if (cached === null) {
			return Option.none();
		}

		try {
			const parsed = JSON.parse(cached) as T;
			return Option.some(parsed);
		} catch {
			// If parsing fails, treat as cache miss
			return Option.none();
		}
	});
}

export function setCached<T>(
	key: string,
	value: T,
	ttlSeconds: number = 300,
): Effect.Effect<void, Redis.CommandError | Error> {
	return Effect.gen(function* () {
		const client = yield* getRedisClient();
		const serialized = JSON.stringify(value);
		yield* Effect.tryPromise({
			try: () => client.setex(key, ttlSeconds, serialized),
			catch: (error) => error as Redis.CommandError,
		});
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
