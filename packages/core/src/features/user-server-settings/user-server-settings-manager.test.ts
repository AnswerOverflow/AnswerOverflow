import { AnswerOverflowClient } from "../../answer-overflow-client";
import { clearDatabase, TEST_SERVER_1, TEST_USER_1 } from "../../utils/test-constants";

let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  await clearDatabase(answer_overflow_client);
});

// Test Cases:
describe("UserServerSettingsManager", () => {
  it("should mark a user as consenting to a server", async () => {
    const settings = await answer_overflow_client.user_server_settings.upsert({
      create: {
        server: TEST_SERVER_1,
        user: TEST_USER_1,
        user_server_settings: {
          allowed_to_show_messages: true,
        },
      },
      update: {
        user_server_settings: {
          allowed_to_show_messages: true,
        },
      },
    });
    expect(settings.allowed_to_show_messages).toBeTruthy();
  });
});
