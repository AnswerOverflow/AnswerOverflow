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

const TEST_USER_1 = {
  name: "Test User",
  email: "test",
  avatar: "test",
  id: "1",
};

const TEST_SERVER_1 = {
  name: "Test Server",
  id: "2",
};

describe("User Server Settings - Grant Consent", () => {
  it("GIVEN a new user and new server THEN mark as consenting successfully", async () => {
    const user_server_settings = await answer_overflow_client.user_server_settings.grantUserConsent(
      TEST_USER_1,
      TEST_SERVER_1
    );
    expect(user_server_settings!.bitfield.checkFlag("ALLOWED_TO_SHOW_MESSAGES")).toBeTruthy();
  });
  it("GIVEN a new user and existing server THEN mark as consenting succesfully", async () => {
    const created_server = await answer_overflow_client.prisma.server.create({
      data: TEST_SERVER_1,
    });
    const user_server_settings = await answer_overflow_client.user_server_settings.grantUserConsent(
      TEST_USER_1,
      created_server
    );
    expect(user_server_settings!.bitfield.checkFlag("ALLOWED_TO_SHOW_MESSAGES")).toBeTruthy();
  });
  it("Existing User New Server", async () => {
    const created_user = await answer_overflow_client.users.createUser(TEST_USER_1);
    const user_server_settings = await answer_overflow_client.user_server_settings.grantUserConsent(
      created_user!,
      TEST_SERVER_1
    );
    expect(user_server_settings!.bitfield.checkFlag("ALLOWED_TO_SHOW_MESSAGES")).toBeTruthy();
  });
  it("Existing User Existing Server", async () => {
    const created_user = await answer_overflow_client.prisma.user.create({
      data: TEST_USER_1,
    });
    const created_server = await answer_overflow_client.prisma.server.create({
      data: TEST_SERVER_1,
    });
    const user_server_settings = await answer_overflow_client.user_server_settings.grantUserConsent(
      created_user,
      created_server
    );
    expect(user_server_settings!.bitfield.checkFlag("ALLOWED_TO_SHOW_MESSAGES")).toBeTruthy();
  });
});

describe("User Server Settings - Revoke Consent", () => {
  it("GIVEN a new user and new server THEN mark as consenting successfully", async () => {
    const user_server_settings = await answer_overflow_client.user_server_settings.grantUserConsent(
      TEST_USER_1,
      TEST_SERVER_1
    );

    expect(user_server_settings!.bitfield.checkFlag("ALLOWED_TO_SHOW_MESSAGES")).toBeTruthy();
    const revoked_user_server_settings =
      await answer_overflow_client.user_server_settings.revokeUserConsent(
        TEST_USER_1,
        TEST_SERVER_1
      );
    expect(
      revoked_user_server_settings!.bitfield.checkFlag("ALLOWED_TO_SHOW_MESSAGES")
    ).toBeFalsy();
  });
});
