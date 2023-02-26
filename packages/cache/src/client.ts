import { createClient } from "redis";
type RedisClientType = ReturnType<typeof createClient>;

let redisClient: RedisClientType;
export async function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }
  const cacheInstance = createClient({
    url: process.env.REDIS_URL,
  });
  cacheInstance.on("connect", () => {
    console.log("CacheStore - Connection status: connected");
  });

  cacheInstance.on("end", () => {
    console.log("CacheStore - Connection status: disconnected");
  });

  cacheInstance.on("reconnecting", () => {
    console.log("CacheStore - Connection status: reconnecting");
  });

  cacheInstance.on("error", (err) => {
    console.log("CacheStore - Connection status: error ", err);
  });
  process.on(
    "exit",
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async () =>
      await cacheInstance
        .disconnect()
        .catch((err) =>
          console.log(
            `CacheStore - Error while disconnecting from redis: ${
              err instanceof Error ? err.message : "Unknown error"
            }`
          )
        )
  );

  await cacheInstance.connect();
  redisClient = cacheInstance;
  return cacheInstance;
}
