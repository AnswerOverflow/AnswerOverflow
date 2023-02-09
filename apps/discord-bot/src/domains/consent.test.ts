import type { AnyThreadChannel, Client, ForumChannel, Message, TextChannel } from "discord.js";
import {
  mockForumChannel,
  mockMessage,
  mockPublicThread,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { provideConsentOnForumChannelMessage } from "./consent";
import {
  toAOChannel,
  toAOChannelWithServer,
  toAODiscordAccount,
  toAOServer,
} from "~discord-bot/utils/conversions";
import {
  createChannelWithDeps,
  createDiscordAccount,
  createServer,
  createUserServerSettings,
  findUserServerSettingsById,
  upsertChannel,
} from "@answeroverflow/db";

let client: Client;
let textChannel: TextChannel;
let textChannelThreadMessage: Message;
let textChannelThread: AnyThreadChannel;

let forumChannel: ForumChannel;
let forumChannelThread: AnyThreadChannel;
let forumChannelThreadMessage: Message;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
  textChannel = mockTextChannel(client);
  forumChannel = mockForumChannel(client, textChannel.guild);
  await createServer(toAOServer(textChannel.guild));
  textChannelThread = mockPublicThread({ client, parentChannel: textChannel });
  forumChannelThread = mockPublicThread({ client, parentChannel: forumChannel });
  textChannelThreadMessage = mockMessage({
    client,
    channel: textChannelThread,
  });
  forumChannelThreadMessage = mockMessage({
    client,
    channel: forumChannelThread,
  });
});
describe("Consent", () => {
  describe("Forum Post Guidelines Consent", () => {
    it("should fail to provide consent in a non-forum channel", async () => {
      await expect(provideConsentOnForumChannelMessage(textChannelThreadMessage)).rejects.toThrow(
        "Message is not in a forum channel"
      );
    });
    it("should fail to provide consent in a forum channel with forum post consent disabled", async () => {
      await expect(provideConsentOnForumChannelMessage(forumChannelThreadMessage)).rejects.toThrow(
        "Forum post guidelines consent is not enabled for this channel"
      );
    });
    it("should provide consent in a forum channel with consent enabled", async () => {
      await upsertChannel({
        ...toAOChannel(forumChannel),
        flags: {
          forumGuidelinesConsentEnabled: true,
        },
      });

      await expect(
        provideConsentOnForumChannelMessage(forumChannelThreadMessage)
      ).resolves.toBeTruthy();

      const updatedSettings = await findUserServerSettingsById({
        serverId: forumChannel.guild.id,
        userId: forumChannelThreadMessage.author.id,
      });

      expect(updatedSettings?.flags.canPubliclyDisplayMessages).toBeTruthy();
    });
    it("should not provide consent if the user already has it", async () => {
      await createChannelWithDeps({
        ...toAOChannelWithServer(forumChannel),
        flags: {
          forumGuidelinesConsentEnabled: true,
        },
      });
      await createDiscordAccount(toAODiscordAccount(forumChannelThreadMessage.author));
      await createUserServerSettings({
        serverId: forumChannel.guild.id,
        userId: forumChannelThreadMessage.author.id,
        flags: {
          canPubliclyDisplayMessages: true,
        },
      });

      await expect(provideConsentOnForumChannelMessage(forumChannelThreadMessage)).rejects.toThrow(
        "Cannot automatically provide consent for user who has already provided consent"
      );
    });
    it("should not provide consent if the user explicitly opted out", async () => {
      await createChannelWithDeps({
        ...toAOChannelWithServer(forumChannel),
        flags: {
          forumGuidelinesConsentEnabled: true,
        },
      });
      await createDiscordAccount(toAODiscordAccount(forumChannelThreadMessage.author));
      await createUserServerSettings({
        serverId: forumChannel.guild.id,
        userId: forumChannelThreadMessage.author.id,
        flags: {
          canPubliclyDisplayMessages: false,
        },
      });
      await expect(provideConsentOnForumChannelMessage(forumChannelThreadMessage)).rejects.toThrow(
        "Cannot automatically provide consent for user who explicitly disabled consent"
      );
    });
  });
});
