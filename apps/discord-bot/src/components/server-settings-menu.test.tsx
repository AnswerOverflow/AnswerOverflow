import { reply } from "~discord-bot/test/reacord-utils";
import React from "react";
import {
  createDiscordAccount,
  createServer,
  ServerWithFlags,
  updateServer,
} from "@answeroverflow/db";
import { mockServerWithFlags, mockUserServerSettingsWithFlags } from "@answeroverflow/db-mock";
import type { ReacordTester } from "@answeroverflow/reacord";
import type { Guild, GuildMember, TextChannel } from "discord.js";
import { mockReacord, setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createGuildMemberVariants,
  GuildMemberVariants,
  mockGuild,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { toAODiscordAccount, toAOServer } from "~discord-bot/utils/conversions";
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

async function toggleButtonTest({
  clicker,
  preClickLabel,
  postClickLabel,
  message,
}: {
  preClickLabel: string;
  postClickLabel: string;
  message: ReacordTester["messages"][number];
  clicker: GuildMember;
}) {
  const preClickButton = message.findButtonByLabel(preClickLabel, reacord);
  expect(preClickButton).toBeDefined();
  await preClickButton!.click(textChannel, clicker);

  // Used to verify no errors were thrown
  expect(reacord.messages).toHaveLength(1);

  const postClickButton = message.findButtonByLabel(postClickLabel, reacord);
  expect(postClickButton).toBeDefined();
}

describe("Server Settings Menu", () => {
  describe("Toggle Read The Rules Consent Button", () => {
    it("should enable read the rules consent", async () => {
      const message = await reply(reacord, <ServerSettingsMenu server={server} />);
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: ENABLE_READ_THE_RULES_CONSENT_LABEL,
        postClickLabel: DISABLE_READ_THE_RULES_CONSENT_LABEL,
        message: message!,
      });
    });
    it("should disable read the rules consent", async () => {
      const updated = await updateServer(
        {
          id: server.id,
          flags: {
            readTheRulesConsentEnabled: true,
          },
        },
        null
      );
      const message = await reply(reacord, <ServerSettingsMenu server={updated} />);
      await toggleButtonTest({
        clicker: members.guildMemberOwner,
        preClickLabel: DISABLE_READ_THE_RULES_CONSENT_LABEL,
        postClickLabel: ENABLE_READ_THE_RULES_CONSENT_LABEL,
        message: message!,
      });
    });
  });
});
