import React from "react";
import type { UserServerSettingsWithFlags } from "@answeroverflow/db";
import { ToggleButton } from "./toggle-button";
import { updateUserConsent } from "~discord-bot/domains/consent";
import type { ComponentEvent } from "@answeroverflow/reacord";
import { componentEventToDiscordJSTypes } from "~discord-bot/utils/conversions";
import { container } from "@sapphire/framework";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
export function ManageAccountMenu({
  initalSettings,
}: {
  initalSettings: UserServerSettingsWithFlags;
}) {
  const [settings, setSettings] = React.useState(initalSettings);
  return (
    <>
      <ToggleButton
        currentlyEnabled={settings.flags.canPubliclyDisplayMessages}
        enableLabel={"Publicly display messages on Answer Overflow"}
        disableLabel={"Disable publicly displaying messages"}
        // eslint-disable-next-line @typescript-eslint/no-misused-promises
        onClick={async (event: ComponentEvent) => {
          const { guild, user } = await componentEventToDiscordJSTypes(event, container.client);
          if (!guild) throw new Error("Guild or user is null");
          const member = await guild.members.fetch(user.id);
          await updateUserConsent({
            canPubliclyDisplayMessages: !settings.flags.canPubliclyDisplayMessages,
            consentSource: "manage-account-menu",
            member,
            onConsentStatusChange(updatedSettings) {
              setSettings(updatedSettings);
            },
            onError: (error) => componentEventStatusHandler(event, error.message),
          });
        }}
      />
    </>
  );
}
