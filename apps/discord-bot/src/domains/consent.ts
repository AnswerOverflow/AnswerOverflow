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

export const CONSENT_ERROR_REASONS = [
  "api-error",
  "consent-already-given",
  "consent-already-denied",
  "consent-already-explicitly-set",
] as const;

export type ConsentErrorReason = (typeof CONSENT_ERROR_REASONS)[number];

export const CONSENT_SOURCES = [
  "forum-post-guidelines",
  "read-the-rules",
  "manage-account-menu",
  "slash-command",
  "mark-solution-response",
] as const;

export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export class ConsentError extends Error {
  constructor(message: string, public reason: ConsentErrorReason) {
    super(message);
    this.name = "ConsentError";
  }
}

export async function provideConsentOnForumChannelMessage(message: Message) {
  const channel = message.channel;
  if (!(channel.isThread() && channel.parent?.type === ChannelType.GuildForum)) {
    return null;
  }
  const channelSettings = await findChannelById(channel.parent.id);
  if (!channelSettings?.flags.forumGuidelinesConsentEnabled) {
    return null;
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
  try {
    const existingUserSettings = await callAPI({
      ApiCall(router) {
        return router.userServerSettings.byId({
          serverId: guild.id,
          userId: member.id,
        });
      },
      getCtx: () => createMemberCtx(member),
      Error: (message) => {
        throw new ConsentError(message, "api-error");
      },
      allowedErrors: "NOT_FOUND",
    });

    if (existingUserSettings) {
      if (existingUserSettings.flags.canPubliclyDisplayMessages === canPubliclyDisplayMessages) {
        throw new ConsentError(
          "Consent is already set to this value",
          canPubliclyDisplayMessages ? "consent-already-given" : "consent-already-denied"
        );
      } else {
        if (isAutomatedConsent) {
          throw new ConsentError(
            "Consent cannot be changed once set",
            "consent-already-explicitly-set"
          );
        }
      }
    }
    return await callAPI({
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
      Error: (message) => {
        throw new ConsentError(message, "api-error");
      },
      async Ok(result) {
        await onConsentStatusChange(result);
        // TODO: Call analytics here
      },
    });
  } catch (error) {
    if (error instanceof ConsentError) {
      let errorMessage = error.message;
      switch (error.reason) {
        case "api-error":
          errorMessage = isAutomatedConsent
            ? `Failed to update consent for ${member.user.id} in ${guild.id} for ${consentSource} due to an API error: ${error.message}`
            : `There was an error updating your consent for ${guild.name}: ${error.message}`;
          break;
        case "consent-already-given":
          errorMessage = isAutomatedConsent
            ? `Consent for ${member.user.id} in ${guild.id} for ${consentSource} is already given`
            : `You have already given consent for ${guild.name}`;
          break;
        case "consent-already-denied":
          errorMessage = isAutomatedConsent
            ? `Consent for ${member.user.id} in ${guild.id} for ${consentSource} is already denied`
            : `You have already denied consent for ${guild.name}`;
          break;
        case "consent-already-explicitly-set":
          errorMessage = isAutomatedConsent
            ? `Consent for ${member.user.id} in ${guild.id} for ${consentSource} is already set`
            : `You have already set your consent for ${guild.name}`;
          break;
      }
      if (onError) {
        await onError(errorMessage);
      }
    } else {
      throw error;
    }
    return null;
  }
}
