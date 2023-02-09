import { ButtonBuilder } from "@discordjs/builders";
import { APIButtonComponent, ButtonStyle, ChannelType, ComponentType, Message } from "discord.js";
import { findChannelById } from "@answeroverflow/db";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";

export const CONSENT_BUTTON_LABEL = "Publicly display my messages on Answer Overflow";
export const CONSENT_BUTTON_ID = "consentButton";
export const CONSENT_BUTTON_DATA = {
  label: CONSENT_BUTTON_LABEL,
  style: ButtonStyle.Success,
  custom_id: CONSENT_BUTTON_ID,
  type: ComponentType.Button,
} as APIButtonComponent;

export function makeConsentButton() {
  return new ButtonBuilder(CONSENT_BUTTON_DATA);
}

export class ConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsentError";
  }
}

export async function provideConsentOnForumChannelMessage(message: Message): Promise<boolean> {
  const channel = message.channel;
  if (!(channel.isThread() && channel.parent?.type === ChannelType.GuildForum)) {
    throw new ConsentError("Message is not in a forum channel");
  }
  const channelSettings = await findChannelById(channel.parent.id);
  if (!channelSettings?.flags.forumGuidelinesConsentEnabled) {
    throw new ConsentError("Forum post guidelines consent is not enabled for this channel");
  }
  const existingUserSettings = await callApiWithConsoleStatusHandler({
    ApiCall(router) {
      return router.userServerSettings.byId({
        serverId: channel.guild.id,
        userId: message.author.id,
      });
    },
    errorMessage: `Failed to find user settings for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    successMessage: `Successfully found user settings for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    getCtx: () => createMemberCtx(message.member!),
  });

  if (existingUserSettings) {
    if (existingUserSettings.flags.canPubliclyDisplayMessages) {
      throw new ConsentError(
        "Cannot automatically provide consent for user who has already provided consent"
      );
    } else {
      throw new ConsentError(
        "Cannot automatically provide consent for user who explicitly disabled consent"
      );
    }
  }

  const data = await callApiWithConsoleStatusHandler({
    ApiCall(router) {
      return router.userServerSettings.upsertWithDeps({
        serverId: channel.guild.id,
        user: toAODiscordAccount(message.author),
        flags: {
          canPubliclyDisplayMessages: true,
        },
      });
    },
    errorMessage: `Failed to provide consent for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    successMessage: `Successfully provided consent for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    getCtx: () => createMemberCtx(message.member!),
  });
  return data?.flags.canPubliclyDisplayMessages ?? false;
}
