import type { ReacordTester } from "@answeroverflow/reacord";
import type { TextChannel, PublicThreadChannel, ForumChannel, Guild, Client } from "discord.js";
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
  SET_SOLVED_TAG_ID_PLACEHOLDER,
  ENABLE_AUTO_THREAD_LABEL,
  DISABLE_AUTO_THREAD_LABEL,
  OPEN_INDEXING_SETTINGS_MENU_LABEL,
  OPEN_HELP_CHANNEL_UTILITIES_LABEL,
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
  ChannelSettingsMenu,
  CLEAR_TAG_VALUE,
  HelpChannelUtilitiesMenu,
  IndexingSettingsMenu,
} from "~discord-bot/components/settings/channel-settings-menu";
import { reply, toggleButtonTest } from "~discord-bot/test/reacord-utils";
import { setupAnswerOverflowBot, mockReacord } from "~discord-bot/test/sapphire-mock";
import { toAOServer, toAOChannel } from "~discord-bot/utils/conversions";
import React from "react";
import { mockChannelWithFlags } from "@answeroverflow/db-mock";
import { Router } from "~discord-bot/components/primitives";
let client: Client;
let reacord: ReacordTester;
let textChannel: TextChannel;
let forumThread: PublicThreadChannel;
let textChannelWithFlags: ChannelWithFlags;
let forumChannelWithFlags: ChannelWithFlags;
let forumChannel: ForumChannel;
let guild: Guild;
let members: GuildMemberVariants;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
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
});

describe("Channel Settings Menu", () => {
  describe("Indexing Settings Menu", () => {
    describe("Toggle Indexing Button", () => {
      it("should enable indexing", async () => {
        const message = await reply(
          reacord,
          <IndexingSettingsMenu
            initialChannelData={textChannelWithFlags}
            targetChannel={textChannel}
          />
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
          <IndexingSettingsMenu initialChannelData={updated} targetChannel={textChannel} />
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
          <IndexingSettingsMenu
            initialChannelData={textChannelWithFlags}
            targetChannel={textChannel}
          />
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
          <IndexingSettingsMenu
            initialChannelData={forumChannelWithFlags}
            targetChannel={forumChannel}
          />
        );
        await toggleButtonTest({
          channel: forumThread,
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
          <IndexingSettingsMenu initialChannelData={updated} targetChannel={forumChannel} />
        );
        await toggleButtonTest({
          channel: forumThread,
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
            initialChannelData={textChannelWithFlags}
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
          <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
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
          <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
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
          <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
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
      it("should be disabled if mark solution is disabled", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={textChannelWithFlags}
            targetChannel={textChannel}
          />
        );
        expect(
          message?.findButtonByLabel(ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL, reacord)
            ?.disabled
        ).toBeTruthy();
      });
    });
    describe("set solved tag id", () => {
      it("should render correctly in a forum channel", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={forumChannelWithFlags}
            targetChannel={forumChannel}
          />
        );
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER, reacord);
        expect(select).not.toBeUndefined();
      });
      it("should not render in a non-forum channel", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={textChannelWithFlags}
            targetChannel={textChannel}
          />
        );
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER, reacord);
        expect(select).toBeUndefined();
      });
      it("should have a clear option", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={forumChannelWithFlags}
            targetChannel={forumChannel}
          />
        );
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER, reacord);
        expect(select?.options.filter((option) => option.value === CLEAR_TAG_VALUE))?.toHaveLength(
          1
        );
      });
      it("should show no tags found if there are no tags", async () => {
        const taglessForum = mockForumChannel(client, guild, {
          available_tags: [],
        });
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={mockChannelWithFlags(toAOServer(guild), toAOChannel(taglessForum))}
            targetChannel={taglessForum}
          />
        );
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER, reacord);
        expect(select?.options.filter((option) => option.label === "No Tags Found"))?.toHaveLength(
          1
        );
      });
      it("should set the tag id", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: forumChannelWithFlags.id,
            flags: {
              markSolutionEnabled: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={forumChannel} />
        );
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER, reacord);
        await select?.select(
          forumThread,
          members.guildMemberOwner,
          forumChannel.availableTags[0]!.id
        );
        const updatedSelect = message?.findSelectByPlaceholder(
          SET_SOLVED_TAG_ID_PLACEHOLDER,
          reacord
        );
        const found = await findChannelById(forumChannelWithFlags.id);
        expect(found!.solutionTagId).toBe(forumChannel.availableTags[0]!.id);
        expect(updatedSelect?.values?.at(0)).toBe(forumChannel.availableTags[0]!.id);
      });
      it("should clear the tag id", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: forumChannelWithFlags.id,
            solutionTagId: forumChannel.availableTags[0]!.id,
            flags: {
              markSolutionEnabled: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={forumChannel} />
        );
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER, reacord);
        await select?.select(forumThread, members.guildMemberOwner, CLEAR_TAG_VALUE);
        const updatedSelect = message?.findSelectByPlaceholder(
          SET_SOLVED_TAG_ID_PLACEHOLDER,
          reacord
        );
        const found = await findChannelById(forumChannelWithFlags.id);
        expect(found!.solutionTagId).toBe(null);
        expect(updatedSelect?.values?.at(0)).toBe("");
      });
    });
    describe("toggle auto thread", () => {
      it("should not render in a forum channel", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={forumChannelWithFlags}
            targetChannel={forumChannel}
          />
        );
        const button = message?.findButtonByLabel(ENABLE_AUTO_THREAD_LABEL, reacord);
        expect(button).toBeUndefined();
      });
      it("should render correctly in a non-forum channel", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={textChannelWithFlags}
            targetChannel={textChannel}
          />
        );
        const button = message?.findButtonByLabel(ENABLE_AUTO_THREAD_LABEL, reacord);
        expect(button).not.toBeUndefined();
      });
      it("should enable", async () => {
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu
            initialChannelData={textChannelWithFlags}
            targetChannel={textChannel}
          />
        );
        await toggleButtonTest({
          message: message!,
          channel: textChannel,
          clicker: members.guildMemberOwner,
          postClickLabel: DISABLE_AUTO_THREAD_LABEL,
          preClickLabel: ENABLE_AUTO_THREAD_LABEL,
          reacord,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.autoThreadEnabled).toBeTruthy();
      });
      it("should disable", async () => {
        const updated = await updateChannel({
          old: null,
          update: {
            id: textChannelWithFlags.id,
            flags: {
              autoThreadEnabled: true,
            },
          },
        });
        const message = await reply(
          reacord,
          <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
        );
        await toggleButtonTest({
          message: message!,
          channel: textChannel,
          clicker: members.guildMemberOwner,
          postClickLabel: ENABLE_AUTO_THREAD_LABEL,
          preClickLabel: DISABLE_AUTO_THREAD_LABEL,
          reacord,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.autoThreadEnabled).toBeFalsy();
      });
    });
  });
  describe("Channel Settings Menu", () => {
    it("should open the indexing settings correctly", async () => {
      const message = await reply(
        reacord,
        <Router interactionId="0">
          <ChannelSettingsMenu
            channelMenuIsIn={textChannel}
            channelWithFlags={textChannelWithFlags}
            interactionId={"0"}
          />
        </Router>
      );
      const button = message?.findButtonByLabel(OPEN_INDEXING_SETTINGS_MENU_LABEL, reacord);
      expect(button).toBeDefined();
      await button?.click(textChannel, members.guildMemberOwner);
      const enableIndexingButton = message?.findButtonByLabel(
        ENABLE_CHANNEL_INDEXING_LABEL,
        reacord
      );
      expect(enableIndexingButton).toBeDefined();
    });
    it("should open the help channel utilities menu correctly", async () => {
      const message = await reply(
        reacord,
        <Router interactionId="0">
          <ChannelSettingsMenu
            channelMenuIsIn={textChannel}
            channelWithFlags={textChannelWithFlags}
            interactionId={"0"}
          />
        </Router>
      );
      const button = message?.findButtonByLabel(OPEN_HELP_CHANNEL_UTILITIES_LABEL, reacord);
      expect(button).toBeDefined();
      await button?.click(textChannel, members.guildMemberOwner);
      const enableAutoThreadButton = message?.findButtonByLabel(ENABLE_AUTO_THREAD_LABEL, reacord);
      expect(enableAutoThreadButton).toBeDefined();
    });
  });
});
