import { ActionRow, Link } from '@answeroverflow/discordjs-react';
import type { ServerWithFlags } from '@answeroverflow/db';
import React from 'react';
import {
	setAnonymizeMessages,
	updateConsiderAllMessagesPublic,
	updateReadTheRulesConsentEnabled,
} from '~discord-bot/domains/server-settings';
import {
	EmbedMenuInstruction,
	InstructionsContainer,
	ToggleButton,
} from '../primitives';
import {
	DISABLE_ANONYMIZE_MESSAGES_LABEL,
	DISABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
	DISABLE_READ_THE_RULES_CONSENT_LABEL,
	ENABLE_ANONYMIZE_MESSAGES_LABEL,
	ENABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
	ENABLE_READ_THE_RULES_CONSENT_LABEL,
	READ_THE_RULES_CONSENT_PROMPT,
	VIEW_ON_ANSWEROVERFLOW_LABEL,
} from '@answeroverflow/constants';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';
import { ephemeralReply } from '~discord-bot/utils/utils';

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
		onClick={async (interaction, enabled) =>
			guildTextChannelOnlyInteraction(interaction, async ({ member }) =>
				updateReadTheRulesConsentEnabled({
					enabled,
					member,
					Error: (error) => ephemeralReply(error.message, interaction),
					Ok(result) {
						setServer(result);
					},
				}),
			)
		}
	/>
);

const ToggleConsiderAllMessagesAsPublic = ({
	server,
	setServer,
}: {
	server: ServerWithFlags;
	setServer: (server: ServerWithFlags) => void;
}) => (
	<ToggleButton
		currentlyEnabled={server.flags.considerAllMessagesPublic}
		enableLabel={ENABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL}
		disableLabel={DISABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL}
		onClick={async (interaction, enabled) =>
			guildTextChannelOnlyInteraction(interaction, async ({ member }) =>
				updateConsiderAllMessagesPublic({
					enabled,
					member,
					Error: (error) => ephemeralReply(error.message, interaction),
					Ok(result) {
						setServer(result);
					},
				}),
			)
		}
	/>
);

const ToggleAnonymizeMessages = ({
	server,
	setServer,
}: {
	server: ServerWithFlags;
	setServer: (server: ServerWithFlags) => void;
}) => (
	<ToggleButton
		currentlyEnabled={server.flags.anonymizeMessages}
		enableLabel={ENABLE_ANONYMIZE_MESSAGES_LABEL}
		disableLabel={DISABLE_ANONYMIZE_MESSAGES_LABEL}
		onClick={async (interaction, enabled) =>
			guildTextChannelOnlyInteraction(interaction, async ({ member }) =>
				setAnonymizeMessages({
					enabled,
					member,
					Error: (error) => ephemeralReply(error.message, interaction),
					Ok(result) {
						setServer(result);
					},
				}),
			)
		}
	/>
);

export function ServerSettingsMenu({
	server: initialServer,
}: {
	server: ServerWithFlags;
}) {
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
								'New members will not be marked as consenting to have their messages publicly displayed on Answer Overflow.',
						},
						{
							enabled: !server.flags.readTheRulesConsentEnabled,
							title: ENABLE_READ_THE_RULES_CONSENT_LABEL,
							instructions: `New members who agree to the membership screening will be marked as consenting. You must have the following test in your membership screening before enabling: \n\n\`${READ_THE_RULES_CONSENT_PROMPT}\``,
						},
						{
							enabled: server.flags.considerAllMessagesPublic,
							title: DISABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
							instructions:
								'Only messages from members who have consented will be displayed',
						},
						{
							enabled: !server.flags.considerAllMessagesPublic,
							title: ENABLE_CONSIDER_ALL_MESSAGES_PUBLIC_LABEL,
							instructions:
								'All messages from your server will be displayed without users having to give consent. This is recommended for highly public servers.',
						},
						{
							enabled: !server.flags.anonymizeMessages,
							title: ENABLE_ANONYMIZE_MESSAGES_LABEL,
							instructions:
								'Hides the name, id, and avatar of the author of messages unless they have consented to have their messages publicly displayed. If `Consider all messages as public` is enabled, this setting will still apply.\n\n*This is not completely anonymous as someone can still join your server, search for the message content, and find the author.*',
						},
						{
							enabled: server.flags.anonymizeMessages,
							title: DISABLE_ANONYMIZE_MESSAGES_LABEL,
							instructions:
								'Display the name, id, and avatar of the author of messages for all users in your server',
						},
						{
							enabled: true,
							title: VIEW_ON_ANSWEROVERFLOW_LABEL,
							instructions: 'View your community on answeroverflow.com',
						},
					]}
				/>
			</InstructionsContainer>
			<ToggleReadTheRulesConsentButton setServer={setServer} server={server} />
			<ToggleConsiderAllMessagesAsPublic
				setServer={setServer}
				server={server}
			/>
			<ToggleAnonymizeMessages setServer={setServer} server={server} />
			<ActionRow>
				<Link
					url={`https://answeroverflow.com/c/${server.id}`}
					label={VIEW_ON_ANSWEROVERFLOW_LABEL}
				/>
			</ActionRow>
		</>
	);
}
