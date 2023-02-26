import { cleanupRedis } from "@answeroverflow/cache";
export async function teardown() {
  await cleanupRedis();
}
