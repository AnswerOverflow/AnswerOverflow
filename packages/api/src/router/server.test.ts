import { clearDatabase } from "@answeroverflow/db";
import { TEST_SERVER_1 } from "~api/test/utils";
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
