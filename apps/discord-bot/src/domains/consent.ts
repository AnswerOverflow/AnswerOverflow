import { ButtonBuilder } from "@discordjs/builders";
import {
  APIButtonComponent,
  ButtonStyle,
  ChannelType,
  ComponentType,
  Guild,
  GuildMember,
  Message,
} from "discord.js";
import { findChannelById, UserServerSettingsWithFlags } from "@answeroverflow/db";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callAPI, makeConsoleStatusHandler, TRPCStatusHandler } from "~discord-bot/utils/trpc";

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

export const CONSENT_SOURCES = [
  "forum-post-guidelines",
  "read-the-rules",
  "manage-account-menu",
  "slash-command",
  "mark-solution-response",
] as const;

export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export class ConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsentError";
  }
}

export async function provideConsentOnForumChannelMessage(message: Message) {
  const channel = message.channel;
  if (!(channel.isThread() && channel.parent?.type === ChannelType.GuildForum)) {
    throw new ConsentError("Message is not in a forum channel");
  }
  const channelSettings = await findChannelById(channel.parent.id);
  if (!channelSettings?.flags.forumGuidelinesConsentEnabled) {
    throw new ConsentError("Forum post guidelines consent is not enabled for this channel");
  }
  return updateUserConsent({
    guild: channel.guild,
    member: message.member!,
    consentSource: "forum-post-guidelines",
    canPubliclyDisplayMessages: true,
    onError: makeConsoleStatusHandler({
      errorMessage: "Error updating consent",
    }).Error,
    onConsentStatusChange(updatedSettings) {
      console.log("updatedSettings", updatedSettings);
    },
  });
}

export async function updateUserConsent({
  guild,
  member,
  consentSource,
  canPubliclyDisplayMessages,
  onError,
  onConsentStatusChange,
}: {
  guild: Guild;
  member: GuildMember;
  consentSource: ConsentSource;
  canPubliclyDisplayMessages: boolean;
  onError: TRPCStatusHandler<UserServerSettingsWithFlags>["Error"];
  onConsentStatusChange: (updatedSettings: UserServerSettingsWithFlags) => void | Promise<void>;
}) {
  const isAutomatedConsent =
    consentSource === "forum-post-guidelines" || consentSource === "read-the-rules";
  await callAPI({
    ApiCall(router) {
      return router.userServerSettings.byId({
        serverId: guild.id,
        userId: member.id,
      });
    },
    getCtx: () => createMemberCtx(member),
    Error: onError,
    async Ok(existingUserSettings) {
      if (existingUserSettings) {
        if (existingUserSettings.flags.canPubliclyDisplayMessages === canPubliclyDisplayMessages) {
          if (onError) {
            if (isAutomatedConsent) {
              await onError(
                `Cannot automatically update consent for ${
                  member.id
                } because it has already been set to ${canPubliclyDisplayMessages.toString()} for ${
                  guild.name
                }`
              );
            } else {
              if (canPubliclyDisplayMessages) {
                await onError(
                  `You have already consented to publicly display your messages for ${guild.name}`
                );
              } else {
                await onError(`Your messages are already not publicly displayed in ${guild.name}`);
              }
            }
          }
          return;
        } else {
          if (isAutomatedConsent) {
            if (onError) {
              await onError(
                "Cannot automatically update consent because it has already been manually set"
              );
            }
            return;
          }
        }
      }
      await callAPI({
        ApiCall(router) {
          return router.userServerSettings.upsertWithDeps({
            serverId: guild.id,
            user: toAODiscordAccount(member.user),
            flags: {
              canPubliclyDisplayMessages,
            },
          });
        },
        getCtx: () => createMemberCtx(member),
        Error: onError,
        async Ok(result) {
          await onConsentStatusChange(result);
        },
      });
    },
  });
}
