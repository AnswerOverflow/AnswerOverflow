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
  it("should create a user", async () => {
    const user = await answer_overflow_client.users.create({
      data: {
        id: "123",
        name: "test",
      },
    });
    expect(user.id).toBe("123");
  });
  it("should create multiple users", async () => {
    const users = await answer_overflow_client.users.createMany({
      data: [
        {
          id: "123",
          name: "test",
        },
        {
          id: "456",
          name: "test2",
        },
      ],
    });
    expect(users).toBe(2);
  });
  it("should find a user", async () => {
    await answer_overflow_client.users.create({
      data: {
        id: "123",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.findUnique({
      where: {
        id: "123",
      },
    });
    expect(user?.id).toBe("123");
  });
  it("should find multiple users", async () => {
    const number_created = await answer_overflow_client.users.createMany({
      data: [
        {
          id: "123",
          name: "test",
        },
        {
          id: "456",
          name: "test2",
        },
      ],
    });
    expect(number_created).toBe(2);
    const users = await answer_overflow_client.users.findMany({
      where: {
        id: {
          in: ["123", "456"],
        },
      },
    });
    expect(users.length).toBe(2);
    expect(users[0]!.id).toBe("123");
    expect(users[1]!.id).toBe("456");
  });
  it("should update a user", async () => {
    await answer_overflow_client.users.create({
      data: {
        id: "123",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.update({
      where: {
        id: "123",
      },
      data: {
        name: "test2",
      },
    });
    expect(user.name).toBe("test2");
  });
  it("should update multiple users", async () => {
    await answer_overflow_client.users.createMany({
      data: [
        {
          id: "123",
          name: "test",
        },
        {
          id: "456",
          name: "test2",
        },
      ],
    });
    const number_updated = await answer_overflow_client.users.updateMany({
      where: {
        id: {
          in: ["123", "456"],
        },
      },
      data: {
        name: "test3",
      },
    });
    expect(number_updated).toBe(2);
    const users = await answer_overflow_client.users.findMany({
      where: {
        id: {
          in: ["123", "456"],
        },
      },
    });
    expect(users[0]!.name).toBe("test3");
    expect(users[1]!.name).toBe("test3");
  });
});
