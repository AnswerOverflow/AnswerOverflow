import { reply } from "~discord-bot/test/reacord-utils";
import React from "react";
import {
  createServer,
  getDefaultUserServerSettingsWithFlags,
  UserServerSettingsWithFlags,
} from "@answeroverflow/db";
import { mockUserServerSettingsWithFlags } from "@answeroverflow/db-mock";
import type { ReacordTester } from "@answeroverflow/reacord";
import type { Guild, TextChannel } from "discord.js";
import { mockReacord, setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createGuildMemberVariants,
  GuildMemberVariants,
  mockGuild,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { ManageAccountMenu } from "./manage-account-menu";
import { toAOServer } from "~discord-bot/utils/conversions";

let reacord: ReacordTester;
let textChannel: TextChannel;
let guild: Guild;
let members: GuildMemberVariants;
let defaultSettings: UserServerSettingsWithFlags;
beforeEach(async () => {
  const client = await setupAnswerOverflowBot();
  reacord = mockReacord();
  guild = mockGuild(client);
  members = await createGuildMemberVariants(client, guild);
  textChannel = mockTextChannel(client, guild);
  defaultSettings = getDefaultUserServerSettingsWithFlags({
    serverId: guild.id,
    userId: members.guildMemberOwner.id,
  });
  await createServer(toAOServer(guild));
});

describe("Manage Account Menu", () => {
  describe("Toggle Consent Button", () => {
    it("should enable consent", async () => {
      const message = await reply(reacord, <ManageAccountMenu initalSettings={defaultSettings} />);
      const enableIndexingButton = message!.findButtonByLabel(
        "Publicly display messages on Answer Overflow",
        reacord
      );
      expect(enableIndexingButton).toBeDefined();
      await enableIndexingButton!.click(textChannel, members.guildMemberOwner);
      // Used to verify no errors were thrown
      expect(reacord.messages).toHaveLength(1);
      expect(
        message!.hasButton("Publicly display messages on Answer Overflow", reacord)
      ).toBeFalsy();
      const button = message!.findButtonByLabel("Disable publicly displaying messages", reacord);
      expect(button).toBeDefined();
    });
    it("should disable consent", async () => {
      const message = await reply(
        reacord,
        <ManageAccountMenu
          initalSettings={mockUserServerSettingsWithFlags({
            flags: {
              canPubliclyDisplayMessages: true,
            },
          })}
        />
      );
      const disableIndexingButton = message!.findButtonByLabel(
        "Disable publicly displaying messages",
        reacord
      );
      expect(disableIndexingButton).toBeDefined();
      await disableIndexingButton!.click(textChannel, members.guildMemberOwner);
      // Used to verify no errors were thrown
      expect(reacord.messages).toHaveLength(1);
      expect(message!.hasButton("Disable publicly displaying messages", reacord)).toBeFalsy();
      const button = message!.findButtonByLabel(
        "Publicly display messages on Answer Overflow",
        reacord
      );
      expect(button).toBeDefined();
    });
  });
  describe("Toggle Indexing Of User Messages Button", () => {
    it("should enable indexing of user messages", async () => {
      const message = await reply(
        reacord,
        <ManageAccountMenu
          initalSettings={mockUserServerSettingsWithFlags({
            flags: {
              messageIndexingDisabled: true,
            },
          })}
        />
      );
      const enableIndexingButton = message!.findButtonByLabel(
        "Enable indexing of messages",
        reacord
      );
      expect(enableIndexingButton).toBeDefined();
      await enableIndexingButton!.click(textChannel, members.guildMemberOwner);

      expect(message!.hasButton("Enable indexing of messages", reacord)).toBeFalsy();
      const button = message!.findButtonByLabel("Disable indexing of messages", reacord);
      expect(button).toBeDefined();
    });
    it("should disable indexing of user messages", async () => {
      const message = await reply(reacord, <ManageAccountMenu initalSettings={defaultSettings} />);
      const disableIndexingButton = message!.findButtonByLabel(
        "Disable indexing of messages",
        reacord
      );
      expect(disableIndexingButton).toBeDefined();
      await disableIndexingButton!.click(textChannel, members.guildMemberOwner);

      expect(message!.hasButton("Disable indexing of messages", reacord)).toBeFalsy();
      const button = message!.findButtonByLabel("Enable indexing of messages", reacord);
      expect(button).toBeDefined();
      const consentButton = message!.findButtonByLabel(
        "Publicly display messages on Answer Overflow",
        reacord
      );
      expect(consentButton).toBeDefined();
      expect(consentButton?.disabled).toBeTruthy();
    });
  });
});
