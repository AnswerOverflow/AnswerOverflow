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
import { updateUserServerSettings } from "./manage-account";
import { UpdateSettingsError } from "./settings";

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
  "disable-indexing-button",
] as const;

export type ConsentSource = (typeof CONSENT_SOURCES)[number];

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
  onError?: (error: UpdateSettingsError) => unknown | Promise<unknown>;
  onConsentStatusChange?: (updatedSettings: UserServerSettingsWithFlags) => void | Promise<void>;
}) {
  const guild = member.guild;
  const isAutomatedConsent =
    consentSource === "forum-post-guidelines" || consentSource === "read-the-rules";
  return await updateUserServerSettings({
    source: consentSource,
    member,
    updateData: {
      flags: {
        canPubliclyDisplayMessages,
      },
    },
    checkIfSettingIsAlreadySet({ existingSettings, newValue }) {
      if (isAutomatedConsent) {
        throw new UpdateSettingsError(
          `Consent for ${member.user.id} in ${guild.id} for ${consentSource} is already set`,
          "setting-already-explicitly-set"
        );
      } else if (
        existingSettings.flags.canPubliclyDisplayMessages ===
        newValue.flags.canPubliclyDisplayMessages
      ) {
        if (canPubliclyDisplayMessages) {
          // These are only user facing operations so give a more user friendly error message
          throw new UpdateSettingsError(
            canPubliclyDisplayMessages
              ? `You have already given consent for ${guild.name}`
              : `You have already denied consent for ${guild.name}`,
            "target-value-already-equals-goal-value"
          );
        }
      }
    },
    onError,
    onSettingChange: onConsentStatusChange,
  });
}
