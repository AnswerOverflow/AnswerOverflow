import { ActionRow, Link } from "@answeroverflow/reacord";
import type { ServerWithFlags } from "@answeroverflow/prisma-types";
import React from "react";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import { updateReadTheRulesConsentEnabled } from "~discord-bot/domains/server-settings";
import { componentEventStatusHandler } from "~discord-bot/utils/trpc";
import { EmbedMenuInstruction, InstructionsContainer, ToggleButton } from "../primitives";
import {
  DISABLE_READ_THE_RULES_CONSENT_LABEL,
  ENABLE_READ_THE_RULES_CONSENT_LABEL,
  READ_THE_RULES_CONSENT_PROMPT,
  VIEW_ON_ANSWEROVERFLOW_LABEL,
} from "@answeroverflow/constants";

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
              instructions: `New members who agree to the membership screening will be marked as consenting. You must have the following test in your membership screening before enabling: \n\n\`${READ_THE_RULES_CONSENT_PROMPT}\``,
            },
            {
              enabled: true,
              title: VIEW_ON_ANSWEROVERFLOW_LABEL,
              instructions: "View your community on answeroverflow.com",
            },
          ]}
        />
      </InstructionsContainer>
      <ToggleReadTheRulesConsentButton setServer={setServer} server={server} />
      <ActionRow>
        <Link
          url={`https://answeroverflow.com/c/${server.id}`}
          label={VIEW_ON_ANSWEROVERFLOW_LABEL}
        />
      </ActionRow>
    </>
  );
}
