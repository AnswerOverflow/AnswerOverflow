import { Channel, Server } from "@prisma/client";
import { AnswerOverflowClient } from "../../answer-overflow-client";
import { ChannelSettingsFlags } from "../../structures/channel-settings";
import { PermissionsBitField } from "../../utils/bitfield";

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

const TEST_SERVER_1: Server = {
  name: "Test Server",
  id: "10",
  icon: null,
  kicked_time: null,
};

const TEST_CHANNEL_1: Channel = {
  id: "7",
  name: "Test Channel",
  type: 0,
  server_id: "10",
};

// Not an actual test, just playing around with manager code
describe("Channel Settings - Single Settings", () => {
  it("Creates a new channel with indexing enabled", async () => {
    const channel_settings = await answer_overflow_client.channel_settings.get({
      where: {
        channel_id: TEST_CHANNEL_1.id,
      },
      include: {
        channel: true,
      },
    });
    expect(channel_settings).toBeNull();
    const updated_settings = await answer_overflow_client.channel_settings.enableIndexing(
      TEST_CHANNEL_1,
      TEST_SERVER_1,
      "xdfasdwG",
      null
    );
    expect(updated_settings).not.toBeNull();
    expect(updated_settings!.bitfield.checkFlag("INDEXING_ENABLED")).toBe(true);
    const disabled_indexing = await answer_overflow_client.channel_settings.disableIndexing(
      TEST_CHANNEL_1,
      TEST_SERVER_1,
      null
    );
    expect(disabled_indexing!.bitfield.checkFlag("INDEXING_ENABLED")).toBe(false);
    const new_settings = new PermissionsBitField(ChannelSettingsFlags, 0);
    new_settings.setFlag("INDEXING_ENABLED");
    new_settings.setFlag("AUTO_THREAD_ENABLED");
    new_settings.setFlag("MARK_SOLUTION_ENABLED");
    new_settings.setFlag("CONSENT_PROMPT_IN_POST_GUIDELINES");
    new_settings.setFlag("SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS");
    const final_final_settings = await answer_overflow_client.channel_settings.edit(
      TEST_CHANNEL_1,
      TEST_SERVER_1,
      null,
      {
        permissions: new_settings.value,
        invite_code: "aasdsdf",
        solution_tag_id: "asdsdf",
        last_indexed_snowflake: "asdcasdf",
        channel_id: TEST_CHANNEL_1.id,
      }
    );
    expect(final_final_settings!.bitfield.checkFlag("INDEXING_ENABLED")).toBe(true);
    expect(final_final_settings!.bitfield.checkFlag("AUTO_THREAD_ENABLED")).toBe(true);
    expect(final_final_settings!.bitfield.checkFlag("MARK_SOLUTION_ENABLED")).toBe(true);
    expect(final_final_settings!.bitfield.checkFlag("CONSENT_PROMPT_IN_POST_GUIDELINES")).toBe(
      true
    );
    expect(
      final_final_settings!.bitfield.checkFlag("SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS")
    ).toBe(true);
    const changed_settings = await answer_overflow_client.channel_settings.disableIndexing(
      TEST_CHANNEL_1,
      TEST_SERVER_1,
      final_final_settings
    );
    expect(changed_settings!.bitfield.checkFlag("INDEXING_ENABLED")).toBe(false);
    expect(changed_settings!.bitfield.checkFlag("AUTO_THREAD_ENABLED")).toBe(true);
    expect(changed_settings!.bitfield.checkFlag("MARK_SOLUTION_ENABLED")).toBe(true);
    expect(changed_settings!.bitfield.checkFlag("CONSENT_PROMPT_IN_POST_GUIDELINES")).toBe(true);
    expect(
      changed_settings!.bitfield.checkFlag("SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS")
    ).toBe(true);
  });
});
