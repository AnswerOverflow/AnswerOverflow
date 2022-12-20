import { clearDatabase } from "@answeroverflow/db";
import { TEST_SERVER_1, TEST_SERVER_2 } from "~api/test/utils";
import { createContextInner } from "../context";
import { serverRouter } from "./server";

// eslint-disable-next-line no-unused-vars
let servers: ReturnType<typeof serverRouter["createCaller"]>;
beforeEach(async () => {
  const a = await createContextInner({
    session: null,
    caller: "discord-bot",
    user_servers: null,
  });
  servers = serverRouter.createCaller(a);
  await clearDatabase();
});

describe("serverRouter", () => {
  it("should create a new server", async () => {
    const server = await servers.upsert({
      create: TEST_SERVER_1,
      update: {
        ...TEST_SERVER_1,
      },
    });
    expect(server).toMatchObject(TEST_SERVER_1);
  });
  it("should create a server and then update it", async () => {
    const server = await servers.upsert({
      create: TEST_SERVER_1,
      update: {
        ...TEST_SERVER_1,
      },
    });
    expect(server).toMatchObject(TEST_SERVER_1);
    const updatedServer = await servers.upsert({
      create: TEST_SERVER_1,
      update: {
        ...TEST_SERVER_1,
        name: "updated",
      },
    });
    expect(updatedServer).toMatchObject({
      ...TEST_SERVER_1,
      name: "updated",
    });
  });
  it("should find a server by its id", async () => {
    const server = await servers.upsert({
      create: TEST_SERVER_1,
      update: {
        ...TEST_SERVER_1,
      },
    });
    expect(server).toMatchObject(TEST_SERVER_1);
    const foundServer = await servers.byId(TEST_SERVER_1.id);
    expect(foundServer).toMatchObject(TEST_SERVER_1);
  });
});

describe("Server Upsert Bulk", () => {
  it("should bulk create servers", async () => {
    const upserted_servers = await servers.upsertBulk([
      {
        create: TEST_SERVER_1,
        update: TEST_SERVER_1,
      },
      {
        create: TEST_SERVER_2,
        update: TEST_SERVER_2,
      },
    ]);
    expect(upserted_servers).toHaveLength(2);
    const foundServer = await servers.byId(TEST_SERVER_1.id);
    expect(foundServer).toBeDefined();
  });
  it("should create a server and then bulk update servers", async () => {
    const upserted_server = await servers.upsert({
      create: TEST_SERVER_1,
      update: TEST_SERVER_1,
    });
    expect(upserted_server).toMatchObject(TEST_SERVER_1);
    await servers.upsertBulk([
      {
        create: TEST_SERVER_1,
        update: {
          ...TEST_SERVER_1,
          name: "updated",
        },
      },
      {
        create: TEST_SERVER_2,
        update: {
          ...TEST_SERVER_2,
          name: "updated",
        },
      },
    ]);
    const fetched_servers = await servers.byIdMany([TEST_SERVER_1.id, TEST_SERVER_2.id]);
    expect(fetched_servers).toHaveLength(2);
    expect(fetched_servers).toMatchObject([
      {
        ...TEST_SERVER_1,
        name: "updated",
      },
      {
        ...TEST_SERVER_2,
        name: "updated",
      },
    ]);
  });
});
