import React from "react";
import type { UserServerSettingsWithFlags } from "@answeroverflow/db";
import { ToggleButton } from "./toggle-button";
import { updateUserConsent } from "~discord-bot/domains/consent";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import { updateUserServerIndexingEnabled } from "~discord-bot/domains/manage-account";

type ManageAccountMenuItemProps = {
  settings: UserServerSettingsWithFlags;
  setSettings: (settings: UserServerSettingsWithFlags) => void;
};

const ToggleConsentButton = ({ settings, setSettings }: ManageAccountMenuItemProps) => (
  <ToggleButton
    currentlyEnabled={settings.flags.canPubliclyDisplayMessages}
    enableLabel={"Publicly display messages on Answer Overflow"}
    disabled={settings.flags.messageIndexingDisabled}
    disableLabel={"Disable publicly displaying messages"}
    onClick={(event, enabled) => {
      void guildOnlyComponentEvent(event, async ({ member }) => {
        await updateUserConsent({
          canPubliclyDisplayMessages: enabled,
          consentSource: "manage-account-menu",
          member,
          onSettingChange(updatedSettings) {
            setSettings(updatedSettings);
          },
          onError: (error) => componentEventStatusHandler(event, error.message),
        });
      });
    }}
  />
);

const ToggleIndexingButton = ({ settings, setSettings }: ManageAccountMenuItemProps) => (
  <ToggleButton
    currentlyEnabled={!settings.flags.messageIndexingDisabled}
    enableLabel={"Enable indexing of messages"}
    disableLabel={"Disable indexing of messages"}
    onClick={(event, messageIndexingDisabled) => {
      void guildOnlyComponentEvent(event, async ({ member }) => {
        await updateUserServerIndexingEnabled({
          member,
          messageIndexingDisabled: !messageIndexingDisabled,
          onError: (error) => componentEventStatusHandler(event, error.message),
          onSettingChange(newSettings) {
            setSettings(newSettings);
          },
        });
        // TODO: Delete all messages from the user
      });
    }}
  />
);

// TODO: Make this take in the caller as a prop and compare that when the button is clicked?
// Doesn't matter that much since the action only affects the button clicker
export function ManageAccountMenu({
  initalSettings,
}: {
  initalSettings: UserServerSettingsWithFlags;
}) {
  const [settings, setSettings] = React.useState(initalSettings);
  return (
    <>
      <ToggleConsentButton setSettings={setSettings} settings={settings} />
      <ToggleIndexingButton setSettings={setSettings} settings={settings} />
    </>
  );
}
