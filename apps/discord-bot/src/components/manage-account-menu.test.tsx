import { reply } from "~discord-bot/test/reacord-utils";
import React from "react";
import {
  createDiscordAccount,
  createServer,
  createUserServerSettings,
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
import {
  DISABLE_INDEXING_LABEL,
  ENABLE_INDEXING_LABEL,
  GRANT_CONSENT_LABEL,
  ManageAccountMenu,
  REVOKE_CONSENT_LABEL,
} from "./manage-account-menu";
import { toAODiscordAccount, toAOServer } from "~discord-bot/utils/conversions";

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
      const message = await reply(
        reacord,
        <ManageAccountMenu initalSettings={defaultSettings} initalIsGloballyIgnored={false} />
      );
      const enableIndexingButton = message!.findButtonByLabel(GRANT_CONSENT_LABEL, reacord);
      expect(enableIndexingButton).toBeDefined();
      await enableIndexingButton!.click(textChannel, members.guildMemberOwner);
      // Used to verify no errors were thrown
      expect(reacord.messages).toHaveLength(1);
      expect(message!.hasButton(GRANT_CONSENT_LABEL, reacord)).toBeFalsy();
      const button = message!.findButtonByLabel(REVOKE_CONSENT_LABEL, reacord);
      expect(button).toBeDefined();
    });
    it("should disable consent", async () => {
      await createDiscordAccount(toAODiscordAccount(members.guildMemberOwner.user));
      const initialSettings = await createUserServerSettings(
        mockUserServerSettingsWithFlags({
          serverId: guild.id,
          userId: members.guildMemberOwner.id,
          flags: {
            canPubliclyDisplayMessages: true,
          },
        })
      );

      const message = await reply(
        reacord,
        <ManageAccountMenu initalSettings={initialSettings} initalIsGloballyIgnored={false} />
      );
      const disableIndexingButton = message!.findButtonByLabel(REVOKE_CONSENT_LABEL, reacord);
      expect(disableIndexingButton).toBeDefined();
      await disableIndexingButton!.click(textChannel, members.guildMemberOwner);
      // Used to verify no errors were thrown
      expect(reacord.messages).toHaveLength(1);
      expect(message!.hasButton(REVOKE_CONSENT_LABEL, reacord)).toBeFalsy();
      const button = message!.findButtonByLabel(GRANT_CONSENT_LABEL, reacord);
      expect(button).toBeDefined();
    });
  });
  describe("Toggle Indexing Of User Messages Button", () => {
    it("should enable indexing of user messages", async () => {
      await createDiscordAccount(toAODiscordAccount(members.guildMemberOwner.user));
      const initialSettings = await createUserServerSettings(
        mockUserServerSettingsWithFlags({
          serverId: guild.id,
          userId: members.guildMemberOwner.id,
          flags: {
            messageIndexingDisabled: true,
          },
        })
      );
      const message = await reply(
        reacord,
        <ManageAccountMenu initalSettings={initialSettings} initalIsGloballyIgnored={false} />
      );
      const enableIndexingButton = message!.findButtonByLabel(ENABLE_INDEXING_LABEL, reacord);
      expect(enableIndexingButton).toBeDefined();
      await enableIndexingButton!.click(textChannel, members.guildMemberOwner);

      expect(message!.hasButton(ENABLE_INDEXING_LABEL, reacord)).toBeFalsy();
      const button = message!.findButtonByLabel(DISABLE_INDEXING_LABEL, reacord);
      expect(button).toBeDefined();
    });
    it("should disable indexing of user messages", async () => {
      const message = await reply(
        reacord,
        <ManageAccountMenu initalSettings={defaultSettings} initalIsGloballyIgnored={false} />
      );
      const disableIndexingButton = message!.findButtonByLabel(DISABLE_INDEXING_LABEL, reacord);
      expect(disableIndexingButton).toBeDefined();
      await disableIndexingButton!.click(textChannel, members.guildMemberOwner);

      expect(message!.hasButton(DISABLE_INDEXING_LABEL, reacord)).toBeFalsy();
      const button = message!.findButtonByLabel(ENABLE_INDEXING_LABEL, reacord);
      expect(button).toBeDefined();
      const consentButton = message!.findButtonByLabel(GRANT_CONSENT_LABEL, reacord);
      expect(consentButton).toBeDefined();
      expect(consentButton?.disabled).toBeTruthy();
    });
  });
});
