import React from "react";
import {
  getDefaultUserServerSettingsWithFlags,
  UserServerSettingsWithFlags,
} from "@answeroverflow/db";
import { ToggleButton } from "./toggle-button";
import {
  updateUserConsent,
  updateUserServerIndexingEnabled,
} from "~discord-bot/domains/manage-account";
import { callAPI, componentEventStatusHandler } from "~discord-bot/utils/trpc";
import { guildOnlyComponentEvent } from "~discord-bot/utils/conditions";
import { Button, Embed } from "@answeroverflow/reacord";
import { ANSWER_OVERFLOW_BLUE_AS_INT } from "~discord-bot/utils/constants";
import { createMemberCtx } from "~discord-bot/utils/context";
import { EmbedMenuInstruction, MenuInstruction } from "./instructions";

type ManageAccountMenuItemProps = {
  state: ManageAccountMenuState;
  setSettings: (settings: ManageAccountMenuState) => void;
};
export const REVOKE_CONSENT_LABEL = "Disable publicly showing messages";
export const GRANT_CONSENT_LABEL = "Publicly display messages on Answer Overflow";

const ToggleConsentButton = ({ state, setSettings }: ManageAccountMenuItemProps) => (
  <ToggleButton
    currentlyEnabled={state.settings.flags.canPubliclyDisplayMessages}
    enableLabel={GRANT_CONSENT_LABEL}
    disabled={state.settings.flags.messageIndexingDisabled}
    disableLabel={REVOKE_CONSENT_LABEL}
    onClick={(event, enabled) => {
      void guildOnlyComponentEvent(event, async ({ member }) => {
        await updateUserConsent({
          canPubliclyDisplayMessages: enabled,
          consentSource: "manage-account-menu",
          member,
          Ok(updatedSettings) {
            setSettings({
              settings: updatedSettings,
              isGloballyIgnored: state.isGloballyIgnored,
            });
          },
          Error: (error) => componentEventStatusHandler(event, error.message),
        });
      });
    }}
  />
);

export const DISABLE_INDEXING_LABEL = "Ignore account in server";
export const ENABLE_INDEXING_LABEL = "Enable indexing of messages in server";
const ToggleIndexingButton = ({ state, setSettings }: ManageAccountMenuItemProps) => (
  <ToggleButton
    currentlyEnabled={!state.settings.flags.messageIndexingDisabled}
    enableLabel={ENABLE_INDEXING_LABEL}
    disableLabel={DISABLE_INDEXING_LABEL}
    onClick={(event, messageIndexingDisabled) => {
      void guildOnlyComponentEvent(event, async ({ member }) => {
        await updateUserServerIndexingEnabled({
          member,
          messageIndexingDisabled: !messageIndexingDisabled,
          source: "manage-account-menu",
          Error: (error) => componentEventStatusHandler(event, error.message),
          Ok(newSettings) {
            setSettings({
              settings: newSettings,
              isGloballyIgnored: state.isGloballyIgnored,
            });
          },
        });
      });
    }}
  />
);

export const GLOBALLY_IGNORE_ACCOUNT_LABEL = "Globally ignore account";
export const GloballyIgnoreAccountButton = ({
  setState,
}: {
  setState: (newState: ManageAccountMenuState) => void;
}) => (
  <Button
    label={GLOBALLY_IGNORE_ACCOUNT_LABEL}
    style="danger"
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onClick={async (event) => {
      await guildOnlyComponentEvent(event, async ({ member }) =>
        callAPI({
          apiCall: (router) => router.discordAccounts.delete(event.user.id),
          getCtx: () => createMemberCtx(member),
          Error: (error) => componentEventStatusHandler(event, error.message),
          Ok: () =>
            setState({
              settings: getDefaultUserServerSettingsWithFlags({
                userId: event.user.id,
                serverId: member.guild.id,
              }),
              isGloballyIgnored: true,
            }),
        })
      );
    }}
  />
);

export const STOP_IGNORING_ACCOUNT_LABEL = "Stop ignoring account";
export const StopIgnoringAccountButton = ({
  setState,
}: {
  setState: (settings: ManageAccountMenuState) => void;
}) => (
  <Button
    label={STOP_IGNORING_ACCOUNT_LABEL}
    style="success"
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    onClick={async (event) => {
      await guildOnlyComponentEvent(event, async ({ member }) =>
        callAPI({
          apiCall: (router) => router.discordAccounts.undelete(event.user.id),
          getCtx: () => createMemberCtx(member),
          Error: (error) => componentEventStatusHandler(event, error.message),
          Ok: () => {
            setState({
              settings: getDefaultUserServerSettingsWithFlags({
                userId: event.user.id,
                serverId: member.guild.id,
              }),
              isGloballyIgnored: false,
            });
          },
        })
      );
    }}
  />
);

type ManageAccountMenuState = {
  settings: UserServerSettingsWithFlags;
  isGloballyIgnored: boolean;
};

// TODO: Make this take in the caller as a prop and compare that when the button is clicked?
// Doesn't matter that much since the action only affects the button clicker
export function ManageAccountMenu({
  initialSettings,
  initialIsGloballyIgnored,
}: {
  initialSettings: UserServerSettingsWithFlags;
  initialIsGloballyIgnored: boolean;
}) {
  const [state, setState] = React.useState({
    settings: initialSettings,
    isGloballyIgnored: initialIsGloballyIgnored,
  });
  const settings = state.settings;

  const instructions: MenuInstruction[] = [
    {
      instructions:
        "Allows anyone to see your messages sent in indexed help channels on Answer Overflow. This allows people to find answers to similar questions that you have asked or answered",
      title: "Publicly display messages on Answer Overflow",
      enabled: !settings.flags.canPubliclyDisplayMessages,
    },
    {
      instructions:
        "Your messages will only be visible on Answer Overflow to those that share a server with you",
      title: REVOKE_CONSENT_LABEL,
      enabled: settings.flags.canPubliclyDisplayMessages,
    },
    {
      instructions:
        "Enables your messages to be indexed in this server, they will appear on AnswerOverflow behind a sign in if you have not consented to publicly display them",
      title: ENABLE_INDEXING_LABEL,
      enabled: settings.flags.messageIndexingDisabled,
    },
    {
      instructions:
        "Disables indexing of your account in this server, also will remove all the messages that Answer Overflow has stored from you in this server",
      title: DISABLE_INDEXING_LABEL,
      enabled: !settings.flags.messageIndexingDisabled,
    },
    {
      instructions:
        "Disables indexing of your account in all servers, also will remove all the messages that Answer Overflow has stored from you in all servers",
      title: GLOBALLY_IGNORE_ACCOUNT_LABEL,
      enabled: !state.isGloballyIgnored,
    },
  ];

  const RegularView = () => (
    <>
      <Embed color={ANSWER_OVERFLOW_BLUE_AS_INT}>
        <EmbedMenuInstruction instructions={instructions} />
      </Embed>
      <ToggleConsentButton setSettings={setState} state={state} />
      <ToggleIndexingButton setSettings={setState} state={state} />
      <GloballyIgnoreAccountButton setState={setState} />
    </>
  );

  const GloballyIgnoredView = () => (
    <>
      <Embed color={ANSWER_OVERFLOW_BLUE_AS_INT}>
        <EmbedMenuInstruction
          instructions={[
            {
              title: STOP_IGNORING_ACCOUNT_LABEL,
              enabled: true,
              instructions:
                "You have globally ignored your account, your messages will not be indexed in any server and will not appear on Answer Overflow. You can undo this by clicking the button below",
            },
          ]}
        />
      </Embed>
      <StopIgnoringAccountButton setSta={setState} />
    </>
  );

  return state.isGloballyIgnored ? <GloballyIgnoredView /> : <RegularView />;
}
