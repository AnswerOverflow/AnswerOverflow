import { AnswerOverflowClient } from "../../answer-overflow-client";
let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  await answer_overflow_client.prisma.userServerSettings.deleteMany({});
  await answer_overflow_client.prisma.userChannelSettings.deleteMany({});
  await answer_overflow_client.prisma.serverSettings.deleteMany({});
  await answer_overflow_client.prisma.channelSettings.deleteMany({});
  await answer_overflow_client.prisma.channel.deleteMany({});
  await answer_overflow_client.prisma.server.deleteMany({});
  await answer_overflow_client.prisma.user.deleteMany({});
});

describe("UserManager", () => {
  it("should find first user", async () => {
    const user = await answer_overflow_client.users.findFirst({
      where: {
        id: "1",
      },
    });
    expect(user).toBeNull();
  });
  it("should create a user", async () => {
    const user = await answer_overflow_client.users.create({
      data: {
        id: "1",
        name: "test",
      },
    });

    expect(user).toBeDefined();
    expect(user.id).toBe("1");
    expect(user.name).toBe("test");
  });
  it("should create multiple users", async () => {
    const users = await answer_overflow_client.users.createMany({
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
    expect(users).toBeDefined();
    expect(users.count).toBe(2);
  });
  it("should find a user", async () => {
    await answer_overflow_client.users.create({
      data: {
        id: "1",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.findUnique({
      where: {
        id: "1",
      },
    });
    expect(user).toBeDefined();
    expect(user!.id).toBe("1");
    expect(user!.name).toBe("test");
  });
  it("should find multiple users", async () => {
    await answer_overflow_client.users.createMany({
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
    const users = await answer_overflow_client.users.findMany({
      take: 2,
    });
    expect(users).toBeDefined();
    expect(users.length).toBe(2);
  });
  it("should update a user", async () => {
    await answer_overflow_client.users.create({
      data: {
        id: "1",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.update({
      data: {
        name: "test2",
      },
      where: {
        id: "1",
      },
    });
    expect(user).toBeDefined();
    expect(user.id).toBe("1");
    expect(user.name).toBe("test2");
  });
  it("should update multiple users", async () => {
    await answer_overflow_client.users.createMany({
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
    const users = await answer_overflow_client.users.updateMany({
      data: {
        name: "test2",
      },
      where: {
        id: {
          in: ["1", "2"],
        },
      },
    });
    expect(users).toBeDefined();
    expect(users.count).toBe(2);
  });
  it("should delete a user", async () => {
    await answer_overflow_client.users.create({
      data: {
        id: "1",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.delete({
      where: {
        id: "1",
      },
    });
    expect(user).toBeDefined();
    expect(user.id).toBe("1");
    expect(user.name).toBe("test");
  });
  it("should delete multiple users", async () => {
    await answer_overflow_client.users.createMany({
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
    const users = await answer_overflow_client.users.deleteMany({
      where: {
        id: {
          in: ["1", "2"],
        },
      },
    });
    expect(users).toBeDefined();
    expect(users.count).toBe(2);
  });
  it("should find a user by id", async () => {
    await answer_overflow_client.users.create({
      data: {
        id: "1",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.findById("1");
    expect(user).toBeDefined();
    expect(user!.id).toBe("1");
    expect(user!.name).toBe("test");
  });
});
