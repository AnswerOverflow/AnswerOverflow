import Redis from "ioredis";

let redisClient: Redis | null = null;

function getRedis(): Redis | null {
	if (redisClient) {
		return redisClient;
	}

	const url = process.env.REDIS_URL;
	if (!url) {
		console.log("REDIS_URL not set, using in-memory cache");
		return null;
	}

	try {
		redisClient = new Redis(url, {
			maxRetriesPerRequest: 3,
			retryStrategy: (times) => {
				if (times > 3) return null;
				return Math.min(times * 100, 1000);
			},
		});

		redisClient.on("error", (err) => {
			console.error("Redis error:", err.message);
		});

		return redisClient;
	} catch (err) {
		console.error("Failed to connect to Redis:", err);
		return null;
	}
}

async function cacheGet<T>(key: string): Promise<T | null> {
	const redis = getRedis();
	if (!redis) return null;

	try {
		const value = await redis.get(key);
		if (value) {
			return JSON.parse(value) as T;
		}
	} catch (err) {
		console.error("Redis get error:", err);
	}
	return null;
}

async function cacheSet<T>(
	key: string,
	value: T,
	ttlSeconds = 300,
): Promise<void> {
	const redis = getRedis();
	if (!redis) return;

	try {
		await redis.setex(key, ttlSeconds, JSON.stringify(value));
	} catch (err) {
		console.error("Redis set error:", err);
	}
}

async function closeRedis(): Promise<void> {
	if (redisClient) {
		await redisClient.quit();
		redisClient = null;
	}
}

export { cacheGet, cacheSet, closeRedis, getRedis };
