import { createClient } from 'redis';
import { sharedEnvs } from '@answeroverflow/env/shared';
type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType;
export async function getRedisClient() {
	if (redisClient) {
		return redisClient;
	}
	const cacheInstance = createClient({
		url: sharedEnvs.REDIS_URL,
	});
	process.on('exit', () => cleanupRedis);

	await cacheInstance.connect();
	redisClient = cacheInstance;
	return cacheInstance;
}

export async function cleanupRedis() {
	if (redisClient) {
		await redisClient
			.disconnect()
			.catch((err) =>
				console.log(
					`CacheStore - Error while disconnecting from redis: ${
						err instanceof Error ? err.message : 'Unknown error'
					}`,
				),
			);
	}
}
