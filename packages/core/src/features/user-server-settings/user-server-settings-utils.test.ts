import { AnswerOverflowClient } from "../../answer-overflow-client";
import { clearDatabase } from "../../utils/test-constants";
import {
  enableUserServerSettingsFlag,
  parseUserServerSettings,
} from "./user-server-settings-utils";

let answer_overflow_client: AnswerOverflowClient;
beforeEach(async () => {
  answer_overflow_client = new AnswerOverflowClient();
  await clearDatabase(answer_overflow_client);
  await answer_overflow_client.user_server_settings.createWithDependencies({
    server: {
      name: "1",
      id: "test",
    },
    user: {
      id: "1",
      name: "test",
    },
  });
});

describe("UserServerSettings Utils", () => {
  it("should check that by default message indexing is disabled", async () => {
    const user_server_settings = await answer_overflow_client.user_server_settings.findFirst({});
    const parsed_user_server_settings = parseUserServerSettings(user_server_settings!.settings);
    expect(parsed_user_server_settings.message_indexing_disabled).toBe(false);
  });
  it("should disable message indexing", async () => {
    const user_server_settings = await answer_overflow_client.user_server_settings.findFirst({});
    const updated_settings = enableUserServerSettingsFlag(
      user_server_settings!.settings,
      "MESSAGE_INDEXING_DISABLED"
    );
    await answer_overflow_client.user_server_settings.update({
      where: {
        user_id_server_id: {
          user_id: user_server_settings!.user_id,
          server_id: user_server_settings!.server_id,
        },
      },
      data: {
        settings: updated_settings,
      },
    });
    const updated_user_server_settings =
      await answer_overflow_client.user_server_settings.findFirst({});
    const parsed_user_server_settings = parseUserServerSettings(
      updated_user_server_settings!.settings
    );
    expect(parsed_user_server_settings.message_indexing_disabled).toBe(true);
  });
  it("should check that publicly show messages is disabled by default", async () => {
    const user_server_settings = await answer_overflow_client.user_server_settings.findFirst({});
    expect(user_server_settings!.settings).toBe(0);
    const parsed_user_server_settings = parseUserServerSettings(user_server_settings!.settings);
    expect(parsed_user_server_settings.allowed_to_show_messages).toBe(false);
  });
});
