import { ChannelSettingsMenu } from "~discord-bot/components/settings";
import { reply } from "~discord-bot/test/reacord-utils";
import React from "react";
import { getDefaultChannelWithFlags } from "@answeroverflow/db";
import type { ReacordTester } from "@answeroverflow/reacord";
import type { ForumChannel, Guild, PublicThreadChannel, TextChannel } from "discord.js";
import { mockReacord, setupAnswerOverflowBot } from "~discord-bot/test/sapphire-mock";
import {
  createGuildMemberVariants,
  delay,
  GuildMemberVariants,
  mockForumChannel,
  mockGuild,
  mockPublicThread,
  mockTextChannel,
} from "@answeroverflow/discordjs-mock";
import { toAOChannel } from "~discord-bot/utils/conversions";

let reacord: ReacordTester;
let textChannel: TextChannel;
let forumThread: PublicThreadChannel;
let forumChannel: ForumChannel;
let guild: Guild;
let members: GuildMemberVariants;
beforeEach(async () => {
  const client = await setupAnswerOverflowBot();
  reacord = mockReacord();
  guild = mockGuild(client);
  members = await createGuildMemberVariants(client, guild);
  textChannel = mockTextChannel(client, guild);
  forumChannel = mockForumChannel(client, guild);
  forumThread = mockPublicThread({
    client,
    parentChannel: forumChannel,
  });
});

describe("ChannelSettingsMenu", () => {
  it("should render correctly in a text channel", async () => { });
  it("should render correctly in a forum thread", async () => { });
  test.todo("should render correctly in a text channel thread");
});
