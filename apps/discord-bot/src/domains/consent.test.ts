import type { AnyThreadChannel, Client, ForumChannel, Message, TextChannel } from "discord.js";
import {
  mockForumChannel,
  mockMessage,
  mockPublicThread,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { provideConsentOnForumChannelMessage } from "./consent";
import { testOnlyAPICall } from "~discord-bot/test/helpers";
import { toAOChannelWithServer, toAODiscordAccount } from "~discord-bot/utils/conversions";

let client: Client;
let text_channel: TextChannel;
let text_channel_thread_message: Message;
let text_channel_thread: AnyThreadChannel;

let forum_channel: ForumChannel;
let forum_channel_thread: AnyThreadChannel;
let forum_channel_thread_message: Message;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  text_channel = mockTextChannel(client);
  forum_channel = mockForumChannel(client);
  text_channel_thread = mockPublicThread({ client, parent_channel: text_channel });
  forum_channel_thread = mockPublicThread({ client, parent_channel: forum_channel });
  text_channel_thread_message = mockMessage({
    client,
    channel: text_channel_thread,
  });
  forum_channel_thread_message = mockMessage({
    client,
    channel: forum_channel_thread,
  });
});
describe("Consent", () => {
  describe("Forum Post Guidelines Consent", () => {
    it("should fail to provide consent in a non-forum channel", async () => {
      await expect(
        provideConsentOnForumChannelMessage(text_channel_thread_message)
      ).rejects.toThrow("Message is not in a forum channel");
    });
    it("should fail to provide consent in a forum channel with consent disabled", async () => {
      await expect(
        provideConsentOnForumChannelMessage(forum_channel_thread_message)
      ).rejects.toThrow("Forum post guidelines consent is not enabled for this channel");
    });
    it("should provide consent in a forum channel with consent enabled", async () => {
      await testOnlyAPICall((router) =>
        router.channel_settings.upsertWithDeps({
          channel: toAOChannelWithServer(forum_channel),
          flags: {
            forum_guidelines_consent_enabled: true,
          },
        })
      );
      await expect(
        provideConsentOnForumChannelMessage(forum_channel_thread_message)
      ).resolves.toBeTruthy();
      const updated_settings = await testOnlyAPICall((router) =>
        router.user_server_settings.byId({
          server_id: forum_channel.guild.id,
          user_id: forum_channel_thread_message.author.id,
        })
      );
      expect(updated_settings?.flags.can_publicly_display_messages).toBeTruthy();
    });
    it("should not provide consent if the user already has it", async () => {
      await testOnlyAPICall(async (router) => {
        await router.channel_settings.upsertWithDeps({
          channel: toAOChannelWithServer(forum_channel),
          flags: {
            forum_guidelines_consent_enabled: true,
          },
        });
        await router.user_server_settings.upsertWithDeps({
          server_id: forum_channel.guild.id,
          user: toAODiscordAccount(forum_channel_thread_message.author),
          flags: {
            can_publicly_display_messages: true,
          },
        });
      });

      await expect(
        provideConsentOnForumChannelMessage(forum_channel_thread_message)
      ).rejects.toThrow(
        "Cannot automatically provide consent for user who has already provided consent"
      );
    });
    it("should not provide consent if the user explicitly opted out", async () => {
      await testOnlyAPICall(async (router) => {
        await router.channel_settings.upsertWithDeps({
          channel: toAOChannelWithServer(forum_channel),
          flags: {
            forum_guidelines_consent_enabled: true,
          },
        });
        await router.user_server_settings.upsertWithDeps({
          server_id: forum_channel.guild.id,
          user: toAODiscordAccount(forum_channel_thread_message.author),
          flags: {
            can_publicly_display_messages: false,
          },
        });
      });

      await expect(
        provideConsentOnForumChannelMessage(forum_channel_thread_message)
      ).rejects.toThrow(
        "Cannot automatically provide consent for user who explicitly disabled consent"
      );
    });
  });
});
