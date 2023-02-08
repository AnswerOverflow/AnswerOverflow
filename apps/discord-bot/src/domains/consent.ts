import { ButtonBuilder } from "@discordjs/builders";
import { APIButtonComponent, ButtonStyle, ChannelType, ComponentType, Message } from "discord.js";
import { findChannelById } from "@answeroverflow/db";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callApiWithConsoleStatusHandler } from "~discord-bot/utils/trpc";

export const CONSENT_BUTTON_LABEL = "Publicly display my messages on Answer Overflow";
export const CONSENT_BUTTON_ID = "consent_button";
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
  const channel_settings = await findChannelById(channel.parent.id);
  if (!channel_settings?.flags.forum_guidelines_consent_enabled) {
    throw new ConsentError("Forum post guidelines consent is not enabled for this channel");
  }
  const existing_user_settings = await callApiWithConsoleStatusHandler({
    ApiCall(router) {
      return router.user_server_settings.byId({
        server_id: channel.guild.id,
        user_id: message.author.id,
      });
    },
    error_message: `Failed to find user settings for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    success_message: `Successfully found user settings for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    getCtx: () => createMemberCtx(message.member!),
  });

  if (existing_user_settings) {
    if (existing_user_settings.flags.can_publicly_display_messages) {
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
      return router.user_server_settings.upsertWithDeps({
        server_id: channel.guild.id,
        user: toAODiscordAccount(message.author),
        flags: {
          can_publicly_display_messages: true,
        },
      });
    },
    error_message: `Failed to provide consent for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    success_message: `Successfully provided consent for user ${message.author.id} in server ${channel.guild.id} via forum post guidelines consent`,
    getCtx: () => createMemberCtx(message.member!),
  });
  return data?.flags.can_publicly_display_messages ?? false;
}
