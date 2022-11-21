import { AnswerOverflowClient } from "../../answer-overflow-client";
import { clearDatabase } from "../../utils/test-constants";
let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  await clearDatabase(answer_overflow_client);
});

describe("ServerManager", () => {
  it("should find first server", async () => {
    const server = await answer_overflow_client.servers.findFirst({
      where: {
        id: "1",
      },
    });
    expect(server).toBeNull();
  });
  it("should create a server", async () => {
    const server = await answer_overflow_client.servers.create({
      data: {
        id: "1",
        name: "test",
      },
    });

    expect(server).toBeDefined();
    expect(server.id).toBe("1");
    expect(server.name).toBe("test");
  });
  it("should create multiple servers", async () => {
    const servers = await answer_overflow_client.servers.createMany({
      data: [
        {
          id: "1",
          name: "test",
        },
        {
          id: "2",
          name: "test",
        },
      ],
    });
    expect(servers).toBeDefined();
    expect(servers.count).toBe(2);
  });
  it("should find a server", async () => {
    await answer_overflow_client.servers.create({
      data: {
        id: "1",
        name: "test",
      },
    });
    const server = await answer_overflow_client.servers.findUnique({
      where: {
        id: "1",
      },
    });
    expect(server).toBeDefined();
    expect(server!.id).toBe("1");
    expect(server!.name).toBe("test");
  });
  it("should find multiple servers", async () => {
    await answer_overflow_client.servers.createMany({
      data: [
        {
          id: "1",
          name: "test",
        },
        {
          id: "2",
          name: "test",
        },
      ],
    });
    const servers = await answer_overflow_client.servers.findMany({
      where: {
        name: "test",
      },
    });
    expect(servers).toBeDefined();
    expect(servers.length).toBe(2);
  });
  it("should update a server", async () => {
    await answer_overflow_client.servers.create({
      data: {
        id: "1",
        name: "test",
      },
    });
    const server = await answer_overflow_client.servers.update({
      where: {
        id: "1",
      },
      data: {
        name: "test2",
      },
    });
    expect(server).toBeDefined();
    expect(server.id).toBe("1");
    expect(server.name).toBe("test2");
  });
  it("should update multiple servers", async () => {
    await answer_overflow_client.servers.createMany({
      data: [
        {
          id: "1",
          name: "test",
        },
        {
          id: "2",
          name: "test",
        },
      ],
    });
    const servers = await answer_overflow_client.servers.updateMany({
      where: {
        name: "test",
      },
      data: {
        name: "test2",
      },
    });
    expect(servers).toBeDefined();
    expect(servers.count).toBe(2);
  });
  it("should delete a server", async () => {
    await answer_overflow_client.servers.create({
      data: {
        id: "1",
        name: "test",
      },
    });
    const server = await answer_overflow_client.servers.delete({
      where: {
        id: "1",
      },
    });
    expect(server).toBeDefined();
    expect(server.id).toBe("1");
    expect(server.name).toBe("test");
  });
  it("should delete multiple servers", async () => {
    await answer_overflow_client.servers.createMany({
      data: [
        {
          id: "1",
          name: "test",
        },
        {
          id: "2",
          name: "test",
        },
      ],
    });
    const servers = await answer_overflow_client.servers.deleteMany({
      where: {
        name: "test",
      },
    });
    expect(servers).toBeDefined();
    expect(servers.count).toBe(2);
  });
});
