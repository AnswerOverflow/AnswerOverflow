import { redis } from "./client";
describe("Client", () => {
  it("should be able to connect to redis", async () => {
    const client = await redis;
    const pingResponse = await client.ping();
    expect(pingResponse).toBe("PONG");
      });
});
