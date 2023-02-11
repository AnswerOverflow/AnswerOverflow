import { ButtonBuilder } from "@discordjs/builders";
import {
  APIButtonComponent,
  ButtonStyle,
  ChannelType,
  ComponentType,
  GuildMember,
  Message,
} from "discord.js";
import { findChannelById, findServerById, UserServerSettingsWithFlags } from "@answeroverflow/db";
import { createMemberCtx } from "~discord-bot/utils/context";
import { toAODiscordAccount } from "~discord-bot/utils/conversions";
import { callAPI, callWithAllowedErrors } from "~discord-bot/utils/trpc";

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

// TODO: Find a better return value than `null`
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
    member: message.member!,
    consentSource: "forum-post-guidelines",
    canPubliclyDisplayMessages: true,
  });
}

export async function provideConsentOnReadTheRules({
  oldMember,
  newMember,
}: {
  oldMember: GuildMember;
  newMember: GuildMember;
}) {
  const hasJustReadTheRules = oldMember.pending && !newMember.pending;
  if (!hasJustReadTheRules) return;

  const serverSettings = await findServerById(newMember.guild.id);

  if (!serverSettings?.flags.readTheRulesConsentEnabled) {
    return;
  }
  return updateUserConsent({
    member: newMember,
    consentSource: "read-the-rules",
    canPubliclyDisplayMessages: true,
  });
}

/*
  Bit of an ugly function but we want 1 place where we update the user's consent status
  The steps are as follows:
  Fetch the existing user settings
    If the user has already given consent, throw an error
    If the user has already denied consent, throw an error
    If the user has already explicitly set consent, throw an error only if it is an automated consent method
  Update the user's consent status
*/
export async function updateUserConsent({
  member,
  consentSource,
  canPubliclyDisplayMessages,
  onError = () => {},
  onConsentStatusChange = () => {},
}: {
  member: GuildMember;
  consentSource: ConsentSource;
  canPubliclyDisplayMessages: boolean;
  onError?: (error: ConsentError) => unknown | Promise<unknown>;
  onConsentStatusChange?: (updatedSettings: UserServerSettingsWithFlags) => void | Promise<void>;
}) {
  const guild = member.guild;
  const isAutomatedConsent =
    consentSource === "forum-post-guidelines" || consentSource === "read-the-rules";

  try {
    // 1. Fetch the existing user settings
    const existingUserSettings = await callAPI({
      apiCall(router) {
        return callWithAllowedErrors({
          call: () =>
            router.userServerSettings.byId({
              serverId: guild.id,
              userId: member.id,
            }),
          allowedErrors: "NOT_FOUND",
        });
      },
      getCtx: () => createMemberCtx(member),
      Error: (_, messageWithCode) => {
        throw new ConsentError(
          isAutomatedConsent
            ? `Failed to update consent for ${member.user.id} in ${guild.id} for ${consentSource} due to an API error: ${messageWithCode}`
            : `There was an error updating your consent for ${guild.name}: \n\n${messageWithCode}`,
          "api-error"
        );
      },
    });

    // 2. Check if the user has already given/denied consent
    if (existingUserSettings) {
      if (isAutomatedConsent) {
        throw new ConsentError(
          `Consent for ${member.user.id} in ${guild.id} for ${consentSource} is already set`,
          "consent-already-explicitly-set"
        );
      } else if (
        existingUserSettings.flags.canPubliclyDisplayMessages === canPubliclyDisplayMessages
      ) {
        if (canPubliclyDisplayMessages) {
          throw new ConsentError(
            `You have already given consent for ${guild.name}`,
            "consent-already-given"
          );
        } else {
          throw new ConsentError(
            `You have already denied consent for ${guild.name}`,
            "consent-already-denied"
          );
        }
      }
    }

    // 3. Update the user's consent status
    return await callAPI({
      apiCall(router) {
        return router.userServerSettings.upsertWithDeps({
          serverId: guild.id,
          user: toAODiscordAccount(member.user),
          flags: {
            canPubliclyDisplayMessages,
          },
        });
      },
      getCtx: () => createMemberCtx(member),
      Error: (_, messageWithCode) => {
        throw new ConsentError(
          isAutomatedConsent
            ? `Failed to update consent for ${member.user.id} in ${guild.id} for ${consentSource} due to an API error: ${messageWithCode}`
            : `There was an error updating your consent for ${guild.name}: \n\n${messageWithCode}`,
          "api-error"
        );
      },
      async Ok(result) {
        await onConsentStatusChange(result);
        // TODO: Call analytics here
      },
    });
  } catch (error) {
    if (!(error instanceof ConsentError)) throw error;
    if (onError) {
      await onError(error);
    }
    return null;
  }
}
