import { findLinkByURL, reply, toggleButtonTest } from "~discord-bot/test/reacord-utils";
import React from "react";
import { createServer, findServerById, ServerWithFlags, updateServer } from "@answeroverflow/db";
import type { ReacordTester } from "@answeroverflow/reacord";
import type { Guild, TextChannel } from "discord.js";
import { mockReacord, setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createGuildMemberVariants,
  GuildMemberVariants,
  mockGuild,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { toAOServer } from "~discord-bot/utils/conversions";
import {
  DISABLE_READ_THE_RULES_CONSENT_LABEL,
  ENABLE_READ_THE_RULES_CONSENT_LABEL,
  ServerSettingsMenu,
} from "~discord-bot/components/server-settings-menu";

let reacord: ReacordTester;
let textChannel: TextChannel;
let guild: Guild;
let members: GuildMemberVariants;
let server: ServerWithFlags;
beforeEach(async () => {
  const client = await setupAnswerOverflowBot();
  reacord = mockReacord();
  guild = mockGuild(client);
  members = await createGuildMemberVariants(client, guild);
  textChannel = mockTextChannel(client, guild);
  server = await createServer(toAOServer(guild));
});

describe("Server Settings Menu", () => {
  describe("Toggle Read The Rules Consent Button", () => {
    it("should enable read the rules consent", async () => {
      const message = await reply(reacord, <ServerSettingsMenu server={server} />);
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: ENABLE_READ_THE_RULES_CONSENT_LABEL,
        postClickLabel: DISABLE_READ_THE_RULES_CONSENT_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
      const updated = await findServerById(server.id);
      expect(updated!.flags.readTheRulesConsentEnabled).toBeTruthy();
    });
    it("should disable read the rules consent", async () => {
      const updated = await updateServer({
        existing: null,
        update: {
          id: server.id,
          flags: {
            readTheRulesConsentEnabled: true,
          },
        },
      });
      const message = await reply(reacord, <ServerSettingsMenu server={updated} />);
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: DISABLE_READ_THE_RULES_CONSENT_LABEL,
        postClickLabel: ENABLE_READ_THE_RULES_CONSENT_LABEL,
        message: message!,
        reacord,
        channel: textChannel,
      });
      const updated2 = await findServerById(server.id);
      expect(updated2!.flags.readTheRulesConsentEnabled).toBeFalsy();
    });
  });
  describe("View On Answer Overflow Link", () => {
    it("should have a link to the server's page on Answer Overflow", async () => {
      const message = await reply(reacord, <ServerSettingsMenu server={server} />);
      expect(findLinkByURL(message!, `https://answeroverflow.com/c/${server.id}`)).toBeTruthy();
    });
  });
});
