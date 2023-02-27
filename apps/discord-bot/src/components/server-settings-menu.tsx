import { Link } from "@answeroverflow/reacord";
import type { ServerWithFlags } from "@answeroverflow/prisma-types";
import React from "react";
import { ToggleButton } from "~discord-bot/components/toggle-button";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";

export const ENABLE_READ_THE_RULES_CONSENT_LABEL = "Enable read the rules consent";
export const DISABLE_READ_THE_RULES_CONSENT_LABEL = "Disable read the rules consent";

const ToggleReadTheRulesConsentButton = ({
  server,
  setServer,
}: {
  server: ServerWithFlags;
  setServer: (server: ServerWithFlags) => void;
}) => (
  <ToggleButton
    currentlyEnabled={server.flags.readTheRulesConsentEnabled}
    enableLabel={ENABLE_READ_THE_RULES_CONSENT_LABEL}
    disableLabel={DISABLE_READ_THE_RULES_CONSENT_LABEL}
    onClick={(event, enabled) => {
      void guildOnlyComponentEvent(event, async ({ member }) => {
        setServer({
          ...server,
          flags: {
            readTheRulesConsentEnabled: enabled,
          },
        });
      });
    }}
  />
);

export function ServerSettingsMenu({ server: initialServer }: { server: ServerWithFlags }) {
  const [server, setServer] = React.useState(initialServer);
  return (
    <>
      <ToggleReadTheRulesConsentButton setServer={setServer} server={server} />
      <Link url={`https://answeroverflow.com/c/${server.id}`} label="View On Answer Overflow" />
    </>
  );
}
