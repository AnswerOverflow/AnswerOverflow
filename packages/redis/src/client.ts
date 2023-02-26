import { createClient } from "redis";
type RedisClientType = ReturnType<typeof createClient>;

declare global {
  // eslint-disable-next-line no-var, no-unused-vars
  var redis: RedisClientType | Promise<RedisClientType> | undefined;
}

async function initializeClient(): Promise<RedisClientType> {
  const client = createClient({
    url: process.env.REDIS_URL,

  });

  client.on("error", (err) => console.log("Redis Client Error", err));
  await client.connect();
  return client;
}

export const redis = global.redis || initializeClient();

if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}

if (process.env.NODE_ENV !== "production") {
  global.redis = redis;
}
