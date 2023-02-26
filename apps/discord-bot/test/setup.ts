import { cleanupRedis } from "@answeroverflow/cache";

afterAll(async () => {
  await cleanupRedis();
});
