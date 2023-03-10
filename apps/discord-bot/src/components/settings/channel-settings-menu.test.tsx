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
import { mockReply, toggleButtonTest } from "~discord-bot/test/discordjs-react-utils";
import { setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import { toAOServer, toAOChannel } from "~discord-bot/utils/conversions";
import React from "react";
import { mockChannelWithFlags } from "@answeroverflow/db-mock";

let client: Client;
let textChannel: TextChannel;
let forumThread: PublicThreadChannel;
let textChannelWithFlags: ChannelWithFlags;
let forumChannelWithFlags: ChannelWithFlags;
let forumChannel: ForumChannel;
let guild: Guild;
let members: GuildMemberVariants;
beforeEach(async () => {
  client = await setupAnswerOverflowBot();
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
        const message = await mockReply({
          channel: textChannel,
          content: (
            <ChannelSettingsMenu
              channelMenuIsIn={textChannel}
              channelWithFlags={textChannelWithFlags}
            />
          ),
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,
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

        const message = await mockReply({
          channel: textChannel,
          content: <ChannelSettingsMenu channelMenuIsIn={textChannel} channelWithFlags={updated} />,
          member: members.guildMemberOwner,
        });

        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,
          preClickLabel: DISABLE_CHANNEL_INDEXING_LABEL,
          postClickLabel: ENABLE_CHANNEL_INDEXING_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.indexingEnabled).toBeFalsy();
      });
    });
    describe("Forum Guidelines Consent Button", () => {
      it("should not render in a text channel", async () => {
        const message = await mockReply({
          content: (
            <IndexingSettingsMenu
              initialChannelData={textChannelWithFlags}
              targetChannel={textChannel}
            />
          ),
          channel: textChannel,
          member: members.guildMemberOwner,
        });
        expect(message?.findButtonByLabel(ENABLE_FORUM_GUIDELINES_CONSENT_LABEL)).toBeUndefined();
        expect(message?.findButtonByLabel(DISABLE_FORUM_GUIDELINES_CONSENT_LABEL)).toBeUndefined();
      });
      it("should enable in a forum channel", async () => {
        const message = await mockReply({
          content: (
            <IndexingSettingsMenu
              initialChannelData={forumChannelWithFlags}
              targetChannel={forumChannel}
            />
          ),
          channel: forumThread,
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,

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
        const message = await mockReply({
          content: (
            <IndexingSettingsMenu initialChannelData={updated} targetChannel={forumChannel} />
          ),
          channel: forumThread,
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,
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
        const message = await mockReply({
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={textChannelWithFlags}
              targetChannel={textChannel}
            />
          ),
          channel: textChannel,
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,
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
        const message = await mockReply({
          content: (
            <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
          ),
          channel: textChannel,
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,

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
        const message = await mockReply({
          content: (
            <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
          ),
          channel: textChannel,
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,

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
        const message = await mockReply({
          channel: textChannel,
          member: members.guildMemberOwner,
          content: (
            <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
          ),
        });
        await toggleButtonTest({
          clicker: members.guildMemberOwner.user,
          message: message,

          preClickLabel: DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
          postClickLabel: ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.sendMarkSolutionInstructionsInNewThreads).toBeFalsy();
      });
      it("should be disabled if mark solution is disabled", async () => {
        const message = await mockReply({
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={textChannelWithFlags}
              targetChannel={textChannel}
            />
          ),
          channel: textChannel,
          member: members.guildMemberOwner,
        });
        expect(
          message?.findButtonByLabel(ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL)?.disabled
        ).toBeTruthy();
      });
    });
    describe("set solved tag id", () => {
      it("should render correctly in a forum channel", async () => {
        const message = await mockReply({
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={forumChannelWithFlags}
              targetChannel={forumChannel}
            />
          ),
          channel: forumChannel,
          member: members.guildMemberOwner,
        });
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        expect(select).not.toBeUndefined();
      });
      it("should not render in a non-forum channel", async () => {
        const message = await mockReply({
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={textChannelWithFlags}
              targetChannel={textChannel}
            />
          ),
          channel: textChannel,
          member: members.guildMemberOwner,
        });
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        expect(select).toBeUndefined();
      });
      it("should have a clear option", async () => {
        const message = await mockReply({
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={forumChannelWithFlags}
              targetChannel={forumChannel}
            />
          ),
          channel: forumChannel,
          member: members.guildMemberOwner,
        });
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        expect(select?.options?.filter((option) => option.value === CLEAR_TAG_VALUE))?.toHaveLength(
          1
        );
      });
      it("should show no tags found if there are no tags", async () => {
        const taglessForum = mockForumChannel(client, guild, {
          available_tags: [],
        });
        const message = await mockReply({
          channel: taglessForum,
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={mockChannelWithFlags(
                toAOServer(guild),
                toAOChannel(taglessForum)
              )}
              targetChannel={taglessForum}
            />
          ),
          member: members.guildMemberOwner,
        });
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        expect(select?.options?.filter((option) => option.label === "No Tags Found"))?.toHaveLength(
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
        const message = await mockReply({
          channel: forumThread,
          member: members.guildMemberOwner,
          content: (
            <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={forumChannel} />
          ),
        });
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        const tagToSelect = forumChannel.availableTags[0]!.id;
        await select?.select({
          clicker: members.guildMemberOwner.user,
          values: tagToSelect,
        });
        const updatedSelect = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        const found = await findChannelById(forumChannelWithFlags.id);
        expect(found!.solutionTagId).toBe(tagToSelect);

        const selectedOption = updatedSelect?.options?.filter(
          (option) => option.value === tagToSelect
        );
        expect(selectedOption).toHaveLength(1);
        expect(selectedOption![0]!.default).toBeTruthy();
      });
      it.only("should clear the tag id", async () => {
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
        const message = await mockReply({
          channel: forumThread,
          content: (
            <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={forumChannel} />
          ),
          member: members.guildMemberOwner,
        });
        const select = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        await select?.select({
          clicker: members.guildMemberOwner.user,
          values: CLEAR_TAG_VALUE,
        });
        const updatedSelect = message?.findSelectByPlaceholder(SET_SOLVED_TAG_ID_PLACEHOLDER);
        const found = await findChannelById(forumChannelWithFlags.id);
        expect(found!.solutionTagId).toBe(null);
        const selectedOption = updatedSelect?.options?.filter((option) => option.default);
        expect(selectedOption).toHaveLength(0);
      });
    });
    describe("toggle auto thread", () => {
      it("should not render in a forum channel", async () => {
        const message = await mockReply({
          channel: forumChannel,
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={forumChannelWithFlags}
              targetChannel={forumChannel}
            />
          ),
          member: members.guildMemberOwner,
        });
        const button = message?.findButtonByLabel(ENABLE_AUTO_THREAD_LABEL);
        expect(button).toBeUndefined();
      });
      it("should render correctly in a non-forum channel", async () => {
        const message = await mockReply({
          channel: textChannel,
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={textChannelWithFlags}
              targetChannel={textChannel}
            />
          ),
          member: members.guildMemberOwner,
        });
        const button = message?.findButtonByLabel(ENABLE_AUTO_THREAD_LABEL);
        expect(button).not.toBeUndefined();
      });
      it("should enable", async () => {
        const message = await mockReply({
          channel: textChannel,
          content: (
            <HelpChannelUtilitiesMenu
              initialChannelData={textChannelWithFlags}
              targetChannel={textChannel}
            />
          ),
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          message: message,
          clicker: members.guildMemberOwner.user,
          postClickLabel: DISABLE_AUTO_THREAD_LABEL,
          preClickLabel: ENABLE_AUTO_THREAD_LABEL,
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
        const message = await mockReply({
          channel: textChannel,
          content: (
            <HelpChannelUtilitiesMenu initialChannelData={updated} targetChannel={textChannel} />
          ),
          member: members.guildMemberOwner,
        });
        await toggleButtonTest({
          message: message,
          clicker: members.guildMemberOwner.user,
          postClickLabel: ENABLE_AUTO_THREAD_LABEL,
          preClickLabel: DISABLE_AUTO_THREAD_LABEL,
        });
        const found = await findChannelById(textChannelWithFlags.id);
        expect(found!.flags.autoThreadEnabled).toBeFalsy();
      });
    });
  });
  describe("Channel Settings Menu", () => {
    it("should open the indexing settings correctly", async () => {
      const message = await mockReply({
        channel: textChannel,
        content: (
          <ChannelSettingsMenu
            channelMenuIsIn={textChannel}
            channelWithFlags={textChannelWithFlags}
          />
        ),
        member: members.guildMemberOwner,
      });
      const button = message?.findButtonByLabel(OPEN_INDEXING_SETTINGS_MENU_LABEL);
      expect(button).toBeDefined();
      await button?.click({
        clicker: members.guildMemberOwner.user,
      });
      const enableIndexingButton = message?.findButtonByLabel(ENABLE_CHANNEL_INDEXING_LABEL);
      expect(enableIndexingButton).toBeDefined();
    });
    it("should open the help channel utilities menu correctly", async () => {
      const message = await mockReply({
        channel: textChannel,
        content: (
          <ChannelSettingsMenu
            channelMenuIsIn={textChannel}
            channelWithFlags={textChannelWithFlags}
          />
        ),
        member: members.guildMemberOwner,
      });
      const button = message?.findButtonByLabel(OPEN_HELP_CHANNEL_UTILITIES_LABEL);
      expect(button).toBeDefined();
      await button?.click({
        clicker: members.guildMemberOwner.user,
      });
      const enableAutoThreadButton = message?.findButtonByLabel(ENABLE_AUTO_THREAD_LABEL);
      expect(enableAutoThreadButton).toBeDefined();
    });
  });
});
