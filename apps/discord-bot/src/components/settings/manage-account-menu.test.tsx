import { reply, toggleButtonTest } from "~discord-bot/test/reacord-utils";
import React from "react";
import {
  createDiscordAccount,
  createServer,
  createUserServerSettings,
  deleteDiscordAccount,
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
import { toAODiscordAccount, toAOServer } from "~discord-bot/utils/conversions";
import {
  DISABLE_INDEXING_LABEL,
  ENABLE_INDEXING_LABEL,
  GLOBALLY_IGNORE_ACCOUNT_LABEL,
  GRANT_CONSENT_LABEL,
  REVOKE_CONSENT_LABEL,
  STOP_IGNORING_ACCOUNT_LABEL,
} from "@answeroverflow/constants";
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
        <ManageAccountMenu initialSettings={defaultSettings} initialIsGloballyIgnored={false} />
      );
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: GRANT_CONSENT_LABEL,
        postClickLabel: REVOKE_CONSENT_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
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
        <ManageAccountMenu initialSettings={initialSettings} initialIsGloballyIgnored={false} />
      );
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: REVOKE_CONSENT_LABEL,
        postClickLabel: GRANT_CONSENT_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
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
        <ManageAccountMenu initialSettings={initialSettings} initialIsGloballyIgnored={false} />
      );
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: ENABLE_INDEXING_LABEL,
        postClickLabel: DISABLE_INDEXING_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
      const consentButton = message!.findButtonByLabel(GRANT_CONSENT_LABEL, reacord);
      expect(consentButton?.disabled).toBeFalsy();
    });
    it("should disable indexing of user messages", async () => {
      const message = await reply(
        reacord,
        <ManageAccountMenu initialSettings={defaultSettings} initialIsGloballyIgnored={false} />
      );
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: DISABLE_INDEXING_LABEL,
        postClickLabel: ENABLE_INDEXING_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
      const consentButton = message!.findButtonByLabel(GRANT_CONSENT_LABEL, reacord);
      expect(consentButton?.disabled).toBeTruthy();
    });
  });
  describe("Toggle Globally Ignored Button", () => {
    it("should enable globally ignored", async () => {
      const message = await reply(
        reacord,
        <ManageAccountMenu initialSettings={defaultSettings} initialIsGloballyIgnored={false} />
      );
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: GLOBALLY_IGNORE_ACCOUNT_LABEL,
        postClickLabel: STOP_IGNORING_ACCOUNT_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
    });
    it("should disable globally ignored", async () => {
      await deleteDiscordAccount(toAODiscordAccount(members.guildMemberOwner.user).id);

      const message = await reply(
        reacord,
        <ManageAccountMenu
          initialSettings={getDefaultUserServerSettingsWithFlags({
            serverId: guild.id,
            userId: members.guildMemberOwner.id,
          })}
          initialIsGloballyIgnored={true}
        />
      );

      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: STOP_IGNORING_ACCOUNT_LABEL,
        postClickLabel: GLOBALLY_IGNORE_ACCOUNT_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
    });
  });
});
