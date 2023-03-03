import type { ReacordTester } from "@answeroverflow/reacord";
import type { TextChannel, PublicThreadChannel, ForumChannel, Guild } from "discord.js";
import {
  FORUM_GUIDELINES_CONSENT_PROMPT,
  ENABLE_CHANNEL_INDEXING_LABEL,
  DISABLE_CHANNEL_INDEXING_LABEL,
  ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
  DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
  ENABLE_MARK_AS_SOLUTION_LABEL,
  DISABLE_MARK_AS_SOLUTION_LABEL,
  DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
  ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
} from "@answeroverflow/constants";
import { createServer, createChannel, findChannelById, updateChannel } from "@answeroverflow/db";
import {
  type GuildMemberVariants,
  mockGuild,
  createGuildMemberVariants,
  mockTextChannel,
  mockForumChannel,
  mockPublicThread,
} from "@answeroverflow/discordjs-mock";
import type { ChannelWithFlags } from "@answeroverflow/prisma-types";
import {
  HelpChannelUtilitiesMenu,
  IndexingSettingsMenu,
} from "~discord-bot/components/settings/channel-settings-menu";
import { reply, toggleButtonTest } from "~discord-bot/test/reacord-utils";
import { setupAnswerOverflowBot, mockReacord } from "~discord-bot/test/sapphire-mock";
import { toAOServer, toAOChannel } from "~discord-bot/utils/conversions";
import React from "react";

let reacord: ReacordTester;
let textChannel: TextChannel;
let forumThread: PublicThreadChannel;
let textChannelWithFlags: ChannelWithFlags;
let forumChannelWithFlags: ChannelWithFlags;
let forumChannel: ForumChannel;
let guild: Guild;
let members: GuildMemberVariants;
beforeEach(async () => {
  const client = await setupAnswerOverflowBot();
  reacord = mockReacord();
  guild = mockGuild(client);
  members = await createGuildMemberVariants(client, guild);
  textChannel = mockTextChannel(client, guild);
  forumChannel = mockForumChannel(client, guild, {
    topic: FORUM_GUIDELINES_CONSENT_PROMPT,
  });
  forumThread = mockPublicThread({
    client,
    parentChannel: forumChannel,
  });
  await createServer(toAOServer(guild));
  textChannelWithFlags = await createChannel(toAOChannel(textChannel));
  forumChannelWithFlags = await createChannel(toAOChannel(forumChannel));
  console.log(forumThread.name);
});

// describe("ChannelSettingsMenu", () => {
//   it("should render correctly in a text channel", async () => { });
//   it("should render correctly in a forum thread", async () => { });
//   test.todo("should render correctly in a text channel thread");
// });

describe("Channel Settings Menu", () => {
  describe("Indexing Settings Menu", () => {
    describe("Toggle Indexing Button", () => {
      it("should enable indexing", async () => {
        const message = await reply(
          reacord,
          <IndexingSettingsMenu channelInDB={textChannelWithFlags} targetChannel={textChannel} />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: ENABLE_CHANNEL_INDEXING_LABEL,
          postClickLabel: DISABLE_CHANNEL_INDEXING_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.indexingEnabled).toBeTruthy();
      });
      it("should disable indexing", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: textChannelWithFlags.id,
            flags: {
              indexingEnabled: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <IndexingSettingsMenu channelInDB={updated} targetChannel={textChannel} />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: DISABLE_CHANNEL_INDEXING_LABEL,
          postClickLabel: ENABLE_CHANNEL_INDEXING_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.indexingEnabled).toBeFalsy();
      });
    });
    describe("Forum Guidelines Consent Button", () => {
      it("should not render in a text channel", async () => {
        const message = await reply(
          reacord,
          <IndexingSettingsMenu channelInDB={textChannelWithFlags} targetChannel={textChannel} />
        );
        expect(
          message?.findButtonByLabel(ENABLE_FORUM_GUIDELINES_CONSENT_LABEL, reacord)
        ).toBeUndefined();
        expect(
          message?.findButtonByLabel(DISABLE_FORUM_GUIDELINES_CONSENT_LABEL, reacord)
        ).toBeUndefined();
      });
      it("should enable in a forum channel", async () => {
        const message = await reply(
          reacord,
          <IndexingSettingsMenu channelInDB={forumChannelWithFlags} targetChannel={forumChannel} />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
          postClickLabel: DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
        });
        const found = await findChannelById(forumChannelWithFlags.id);
        expect(found!.flags.forumGuidelinesConsentEnabled).toBeTruthy();
      });
      it("should disable in a forum channel", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: forumChannelWithFlags.id,
            flags: {
              forumGuidelinesConsentEnabled: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <IndexingSettingsMenu channelInDB={updated} targetChannel={forumChannel} />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
          postClickLabel: ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
        });
        const found = await findChannelById(forumChannelWithFlags.id);
        expect(found!.flags.forumGuidelinesConsentEnabled).toBeFalsy();
      });
    });
  });
  describe("Help Channel Utilities Menu", () => {
    describe("Toggle Mark Solution", () => {
      it("should enable", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            channelInDB={textChannelWithFlags}
            targetChannel={textChannel}
          />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: ENABLE_MARK_AS_SOLUTION_LABEL,
          postClickLabel: DISABLE_MARK_AS_SOLUTION_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.markSolutionEnabled).toBeTruthy();
      });
      it("should disable", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: textChannelWithFlags.id,
            flags: {
              markSolutionEnabled: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu channelInDB={updated} targetChannel={textChannel} />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: DISABLE_MARK_AS_SOLUTION_LABEL,
          postClickLabel: ENABLE_MARK_AS_SOLUTION_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.markSolutionEnabled).toBeFalsy();
      });
    });
    describe("Toggle Send Mark Solution Instructions", () => {
      it("should enable", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: textChannelWithFlags.id,
            flags: {
              markSolutionEnabled: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu channelInDB={updated} targetChannel={textChannel} />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
          postClickLabel: DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.sendMarkSolutionInstructionsInNewThreads).toBeTruthy();
      });
      it("should disable", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: textChannelWithFlags.id,
            flags: {
              markSolutionEnabled: true,
              sendMarkSolutionInstructionsInNewThreads: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu channelInDB={updated} targetChannel={textChannel} />
        );
        await toggleButtonTest({
          channel: textChannel,
          clicker: members.guildMemberOwner,
          message: message!,
          reacord,
          preClickLabel: DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
          postClickLabel: ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.sendMarkSolutionInstructionsInNewThreads).toBeFalsy();
      });
      it.only("should be disabled if mark solution is disabled", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            channelInDB={textChannelWithFlags}
            targetChannel={textChannel}
          />
        );
        expect(
          message?.findButtonByLabel(ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL, reacord)
            ?.disabled
        ).toBeTruthy();
      });
    });
  });
});
