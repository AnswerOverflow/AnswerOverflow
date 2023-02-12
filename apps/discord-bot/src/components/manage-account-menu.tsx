import React from "react";
import type { UserServerSettingsWithFlags } from "@answeroverflow/db";
import { ToggleButton } from "./toggle-button";
import { updateUserConsent } from "~discord-bot/domains/consent";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";

type ManageAccountMenuItemProps = {
  settings: UserServerSettingsWithFlags;
  setSettings: (settings: UserServerSettingsWithFlags) => void;
};

const ToggleConsentButton = ({ settings, setSettings }: ManageAccountMenuItemProps) => (
  <ToggleButton
    currentlyEnabled={settings.flags.canPubliclyDisplayMessages}
    enableLabel={"Publicly display messages on Answer Overflow"}
    disableLabel={"Disable publicly displaying messages"}
    onClick={(event, enabled) => {
      void guildOnlyComponentEvent(event, async ({ member }) => {
        await updateUserConsent({
          canPubliclyDisplayMessages: enabled,
          consentSource: "manage-account-menu",
          member,
          onConsentStatusChange(updatedSettings) {
            setSettings(updatedSettings);
          },
          onError: (error) => componentEventStatusHandler(event, error.message),
        });
      });
    }}
  />
);

export function ManageAccountMenu({
  initalSettings,
}: {
  initalSettings: UserServerSettingsWithFlags;
}) {
  const [settings, setSettings] = React.useState(initalSettings);
  return (
    <>
      <ToggleConsentButton setSettings={setSettings} settings={settings} />
    </>
  );
}
