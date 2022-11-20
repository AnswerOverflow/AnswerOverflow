import { AnswerOverflowClient } from "../../answer-overflow-client";
let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  await answer_overflow_client.prisma.userServerSettings.deleteMany({});
  await answer_overflow_client.prisma.serverSettings.deleteMany({});
  await answer_overflow_client.prisma.channelSettings.deleteMany({});
  await answer_overflow_client.prisma.channel.deleteMany({});
  await answer_overflow_client.prisma.server.deleteMany({});
  await answer_overflow_client.prisma.user.deleteMany({});
  await answer_overflow_client.prisma.deletedUser.deleteMany({});
  await answer_overflow_client.prisma.forumChannelTag.deleteMany({});
});

describe("UserServerSettingsManager", () => {
  it("should find first user server settings", async () => {
    const user_server_settings = await answer_overflow_client.user_server_settings.findFirst({
      where: {
        user_id: "1",
        server_id: "1",
      },
    });
    expect(user_server_settings).toBeNull();
  });
  it("should create a user server settings", async () => {
    const server = await answer_overflow_client.servers.create({
      data: {
        id: "322",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.create({
      data: {
        id: "302",
        name: "potato",
      },
    });
    const found_user = await answer_overflow_client.users.findById(user.id);
    expect(found_user).not.toBeNull();
    const found_server = await answer_overflow_client.servers.findUnique({
      where: {
        id: server.id,
      },
    });
    expect(found_server).not.toBeNull();

    const user_server_settings = await answer_overflow_client.user_server_settings.create({
      data: {
        user_id: user.id,
        server_id: server.id,
        settings: 0,
      },
    });

    expect(user_server_settings).toBeDefined();
    expect(user_server_settings.server_id).toBe("322");
    expect(user_server_settings.user_id).toBe("302");
  });
  it("should create a user server settings with dependencies", async () => {
    const user_server_settings =
      await answer_overflow_client.user_server_settings.createWithDependencies({
        server: {
          id: "322",
          name: "test",
        },
        user: {
          id: "302",
          name: "potato",
        },
      });
    expect(user_server_settings).toBeDefined();
    expect(user_server_settings.server_id).toBe("322");
    expect(user_server_settings.user_id).toBe("302");
  });
  it("should create a user and then create user server settings with dependencies", async () => {
    const user = await answer_overflow_client.users.create({
      data: {
        id: "302",
        name: "potato",
      },
    });
    const user_server_settings =
      await answer_overflow_client.user_server_settings.createWithDependencies({
        server: {
          id: "322",
          name: "test",
        },
        user,
      });
    expect(user_server_settings).toBeDefined();
  });
  it("should create a server and then create user server settings with dependencies", async () => {
    const server = await answer_overflow_client.servers.create({
      data: {
        id: "322",
        name: "test",
      },
    });
    const user_server_settings =
      await answer_overflow_client.user_server_settings.createWithDependencies({
        server,
        user: {
          id: "302",
          name: "potato",
        },
      });
    expect(user_server_settings).toBeDefined();
  });
  it("should create a user and a server and then user server settings with dependencies", async () => {
    const server = await answer_overflow_client.servers.create({
      data: {
        id: "322",
        name: "test",
      },
    });
    const user = await answer_overflow_client.users.create({
      data: {
        id: "302",
        name: "potato",
      },
    });
    const user_server_settings =
      await answer_overflow_client.user_server_settings.createWithDependencies({
        server,
        user,
      });
    expect(user_server_settings).toBeDefined();
  });
});
