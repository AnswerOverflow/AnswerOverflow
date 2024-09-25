import { Cache } from "./cache";
import { describe, it, expect } from "bun:test";

const { getRedisClient } = Cache;

describe("Client", () => {
  it("should be able to connect to redis", async () => {
    const client = await getRedisClient();
    const pingResponse = await client.ping();
    expect(pingResponse).toBe("PONG");
  });
});
