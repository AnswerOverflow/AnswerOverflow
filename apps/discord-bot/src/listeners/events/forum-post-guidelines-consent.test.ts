import { Client, ForumChannel, AnyThreadChannel, Message, Events } from "discord.js";
import {
  mockForumChannel,
  mockPublicThread,
  mockMessage,
  emitEvent,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { toAOChannel, toAOServer } from "~discord-bot/utils/conversions";
import { createChannel, createServer, findUserServerSettingsById } from "@answeroverflow/db";

let client: Client;
let forum_channel: ForumChannel;
let forum_channel_thread: AnyThreadChannel;
let forum_channel_thread_message: Message;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  forum_channel = mockForumChannel(client);
  forum_channel_thread = mockPublicThread({ client, parent_channel: forum_channel });
  forum_channel_thread_message = mockMessage({
    client,
    channel: forum_channel_thread,
  });
  await createServer(toAOServer(forum_channel.guild));
  await createChannel({
    ...toAOChannel(forum_channel),
    flags: {
      forum_guidelines_consent_enabled: true,
    },
  });
});

describe("Forum Post Guidelines Consent Listener", () => {
  it("should provide consent in a forum channel with consent enabled", async () => {
    await emitEvent(client, Events.MessageCreate, forum_channel_thread_message);
    const updated = await findUserServerSettingsById({
      user_id: forum_channel_thread_message.author.id,
      server_id: forum_channel.guild.id,
    });
    expect(updated!.flags.can_publicly_display_messages).toBeTruthy();
  });
  it("should provide consent in a forum channel for multiple users", async () => {
    const messages = [
      mockMessage({
        client,
        channel: forum_channel_thread,
      }),
      mockMessage({
        client,
        channel: forum_channel_thread,
      }),
    ];
    await Promise.all(messages.map((message) => emitEvent(client, Events.MessageCreate, message)));
    const updated = await findUserServerSettingsById({
      user_id: messages[0]!.author.id,
      server_id: forum_channel.guild.id,
    });
    expect(updated!.flags.can_publicly_display_messages).toBeTruthy();
    const updated2 = await findUserServerSettingsById({
      user_id: messages[1]!.author.id,
      server_id: forum_channel.guild.id,
    });
    expect(updated2!.flags.can_publicly_display_messages).toBeTruthy();
  });
});
