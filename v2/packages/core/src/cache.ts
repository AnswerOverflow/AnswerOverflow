import { createClient } from "redis";

type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType;

export module Cache {
  export const client = redisClient;
  export async function getRedisClient() {
    if (redisClient) {
      return redisClient;
    }
    const cacheInstance = createClient({
      url: process.env.REDIS_URL,
    });
    process.on("exit", () => cleanupRedis);

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
              err instanceof Error ? err.message : "Unknown error"
            }`
          )
        );
    }
  }
}
