import { Link } from "@answeroverflow/reacord";
import type { ServerWithFlags } from "@answeroverflow/prisma-types";
import React from "react";
import { ToggleButton } from "~discord-bot/components/toggle-button";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import { updateReadTheRulesConsentEnabled } from "~discord-bot/domains/server-settings";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import { InstructionsContainer } from "./instructions-container";
import { EmbedMenuInstruction } from "./instructions";
import { READ_THE_RULES_CONSENT_PROMPT } from "~discord-bot/domains/manage-account";

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
      void guildOnlyComponentEvent(event, async ({ member }) =>
        updateReadTheRulesConsentEnabled({
          enabled,
          member,
          Error: (error) => componentEventStatusHandler(event, error.message),
          Ok(result) {
            setServer(result);
          },
        })
      );
    }}
  />
);

export function ServerSettingsMenu({ server: initialServer }: { server: ServerWithFlags }) {
  const [server, setServer] = React.useState(initialServer);
  return (
    <>
      <InstructionsContainer>
        <EmbedMenuInstruction
          instructions={[
            {
              enabled: server.flags.readTheRulesConsentEnabled,
              title: DISABLE_READ_THE_RULES_CONSENT_LABEL,
              instructions:
                "New members will not be marked as consenting to have their messages publicly displayed on Answer Overflow.",
            },
            {
              enabled: !server.flags.readTheRulesConsentEnabled,
              title: ENABLE_READ_THE_RULES_CONSENT_LABEL,
              instructions: `New members who agree to the membership screening will be marked as consenting. \n\n**Before enabling, add the following text in your membership screening**: \n${READ_THE_RULES_CONSENT_PROMPT}`,
            },
          ]}
        />
      </InstructionsContainer>
      <ToggleReadTheRulesConsentButton setServer={setServer} server={server} />
      <Link url={`https://answeroverflow.com/c/${server.id}`} label="View On Answer Overflow" />
    </>
  );
}
