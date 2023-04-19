import {
	Button,
	Select,
	Option,
	Link,
	ActionRow,
} from '@answeroverflow/discordjs-react';
import {
	ChannelType,
	ForumChannel,
	GuildForumTag,
	NewsChannel,
	TextChannel,
} from 'discord.js';
import LRUCache from 'lru-cache';
import {
	DISABLE_CHANNEL_INDEXING_LABEL,
	ENABLE_CHANNEL_INDEXING_LABEL,
	CLEAR_TAG_LABEL,
	DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
	ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
	FORUM_GUIDELINES_CONSENT_PROMPT,
	DISABLE_MARK_AS_SOLUTION_LABEL,
	ENABLE_MARK_AS_SOLUTION_LABEL,
	DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
	ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
	SET_SOLVED_TAG_ID_PLACEHOLDER,
	DISABLE_AUTO_THREAD_LABEL,
	ENABLE_AUTO_THREAD_LABEL,
	ALLOWED_AUTO_THREAD_CHANNEL_TYPES,
	OPEN_HELP_CHANNEL_UTILITIES_LABEL,
	OPEN_EXPERIMENTAL_SETTINGS_LABEL,
	WAITLIST_URL,
	ENABLE_AI_QUESTION_IMPROVEMENT_SUGGESTIONS_LABEL,
	ENABLE_REDIRECTION_TO_HELP_CHANNEL_LABEL,
	ENABLE_AI_QUESTION_ANSWERING_LABEL,
	OPEN_INDEXING_SETTINGS_MENU_LABEL,
	SEND_CONSENT_PROMPT_LABEL,
	DISCORD_EMOJI_ID,
} from '@answeroverflow/constants';
import type { ChannelWithFlags } from '@answeroverflow/prisma-types';
import React from 'react';
import {
	ToggleButton,
	InstructionsContainer,
	EmbedMenuInstruction,
	Spacer,
	useHistory,
} from '~discord-bot/components/primitives';
import {
	updateChannelIndexingEnabled,
	updateChannelForumGuidelinesConsentEnabled,
	updateMarkAsSolutionEnabled,
	updateSendMarkAsSolutionInstructionsEnabled,
	setSolutionTagId,
	updateAutoThreadEnabled,
} from '~discord-bot/domains/channel-settings';
import { guildTextChannelOnlyInteraction } from '~discord-bot/utils/conditions';
import { oneTimeStatusHandler } from '~discord-bot/utils/trpc';
import type { RootChannel } from '~discord-bot/utils/utils';
import { sendConsentPrompt } from '~discord-bot/domains/manage-account';
import { Message, getDiscordURLForMessage } from '@answeroverflow/db';

type ChannelSettingsMenuItemProps<T extends RootChannel = RootChannel> = {
	channelInDB: ChannelWithFlags;
	setChannel: (channel: ChannelWithFlags) => void;
	targetChannel: T;
};

type ChannelSettingsSubMenuProps = {
	initialChannelData: ChannelWithFlags;
	targetChannel: RootChannel;
};

// Store a cache to handle unmounting of the component
const channelCache = new LRUCache<string, ChannelWithFlags>({
	max: 500,
	ttl: 1000 * 60 * 5,
});

const updateChannelState = (
	setChannelState: (channel: ChannelWithFlags) => void,
	channel: ChannelWithFlags,
) => {
	channelCache.set(channel.id, channel);
	setChannelState(channel);
};

/*
  Indexing Menu
*/

function ToggleIndexingButton({
	channelInDB,
	setChannel,
	targetChannel,
}: ChannelSettingsMenuItemProps) {
	return (
		<ToggleButton
			currentlyEnabled={channelInDB.flags.indexingEnabled}
			disableLabel={DISABLE_CHANNEL_INDEXING_LABEL}
			enableLabel={ENABLE_CHANNEL_INDEXING_LABEL}
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onClick={async (interaction, enabled) =>
				guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
					await updateChannelIndexingEnabled({
						channel: targetChannel,
						enabled,
						member,
						Error: (message) => oneTimeStatusHandler(interaction, message),
						Ok: (updatedChannel) => {
							updateChannelState(setChannel, updatedChannel);
						},
					});
				})
			}
		/>
	);
}

function ToggleForumGuidelinesConsentButton({
	channelInDB,
	setChannel,
	targetChannel,
}: ChannelSettingsMenuItemProps) {
	return (
		<ToggleButton
			currentlyEnabled={channelInDB.flags.forumGuidelinesConsentEnabled}
			disableLabel={DISABLE_FORUM_GUIDELINES_CONSENT_LABEL}
			enableLabel={ENABLE_FORUM_GUIDELINES_CONSENT_LABEL}
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onClick={async (interaction, enabled) =>
				guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
					await updateChannelForumGuidelinesConsentEnabled({
						channel: targetChannel,
						enabled,
						member,
						Error: (message) => oneTimeStatusHandler(interaction, message),
						Ok: (updatedChannel) => {
							updateChannelState(setChannel, updatedChannel);
						},
					});
				})
			}
		/>
	);
}

export function IndexingSettingsMenu({
	targetChannel,
	initialChannelData,
	lastIndexedMessage,
}: ChannelSettingsSubMenuProps & {
	lastIndexedMessage: Message | null;
}) {
	const [channel, setChannel] = React.useState<ChannelWithFlags>(
		channelCache.get(targetChannel.id) ?? initialChannelData,
	);
	const isButtonInForumChannel = targetChannel.type === ChannelType.GuildForum;
	return (
		<>
			<InstructionsContainer>
				**Settings for {targetChannel.name}**
				<Spacer count={2} />
				<EmbedMenuInstruction
					instructions={[
						{
							title: ENABLE_CHANNEL_INDEXING_LABEL,
							enabled: !channel.flags.indexingEnabled,
							instructions:
								'Enable indexing of this channel into web search results',
						},
						{
							title: DISABLE_CHANNEL_INDEXING_LABEL,
							enabled: channel.flags.indexingEnabled,
							instructions:
								'Disable indexing of this channel into web search results, existing indexing content will be cleaned up within 7 days',
						},
						{
							title: ENABLE_FORUM_GUIDELINES_CONSENT_LABEL,
							enabled:
								!channel.flags.forumGuidelinesConsentEnabled &&
								isButtonInForumChannel,
							instructions: `Users posting new threads in this channel will be marked as consenting to have their messages publicly displayed. You must have the following in your post guidelines for this to work:\n\n\`${FORUM_GUIDELINES_CONSENT_PROMPT}\``,
						},
						{
							title: DISABLE_FORUM_GUIDELINES_CONSENT_LABEL,
							enabled:
								channel.flags.forumGuidelinesConsentEnabled &&
								isButtonInForumChannel,
							instructions:
								'Users posting new threads in this channel will no longer be marked as consenting to have their messages publicly displayed',
						},
						{
							title: SEND_CONSENT_PROMPT_LABEL,
							enabled: true,
							instructions: 'Sends a message with a consent prompt and button',
						},
					]}
				/>
			</InstructionsContainer>
			<ToggleIndexingButton
				channelInDB={channel}
				setChannel={setChannel}
				targetChannel={targetChannel}
			/>
			{isButtonInForumChannel && (
				<ToggleForumGuidelinesConsentButton
					channelInDB={channel}
					setChannel={setChannel}
					targetChannel={targetChannel}
				/>
			)}
			<Button
				label={SEND_CONSENT_PROMPT_LABEL}
				style="Primary"
				onClick={(intr) =>
					guildTextChannelOnlyInteraction(intr, async ({ channel }) =>
						sendConsentPrompt({
							channel,
							interaction: intr,
						}),
					)
				}
			/>
			{lastIndexedMessage && (
				<Link
					url={getDiscordURLForMessage(lastIndexedMessage)}
					label="Last Indexed Message"
					emoji={DISCORD_EMOJI_ID}
				/>
			)}
		</>
	);
}

/*
  Help Channel Utilities Menu
*/

function ToggleMarkAsSolutionButton({
	channelInDB,
	setChannel,
	targetChannel,
}: ChannelSettingsMenuItemProps) {
	return (
		<ToggleButton
			currentlyEnabled={channelInDB.flags.markSolutionEnabled}
			disableLabel={DISABLE_MARK_AS_SOLUTION_LABEL}
			enableLabel={ENABLE_MARK_AS_SOLUTION_LABEL}
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onClick={async (interaction, enabled) =>
				guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
					await updateMarkAsSolutionEnabled({
						channel: targetChannel,
						enabled,
						member,
						Error: (message) => oneTimeStatusHandler(interaction, message),
						Ok: (updatedChannel) => {
							updateChannelState(setChannel, updatedChannel);
						},
					});
				})
			}
		/>
	);
}

function ToggleSendMarkAsSolutionInstructionsButton({
	channelInDB,
	setChannel,
	targetChannel,
}: ChannelSettingsMenuItemProps) {
	return (
		<ToggleButton
			currentlyEnabled={
				channelInDB.flags.sendMarkSolutionInstructionsInNewThreads
			}
			disableLabel={DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL}
			enableLabel={ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL}
			disabled={!channelInDB.flags.markSolutionEnabled}
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onClick={async (interaction, enabled) =>
				guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
					await updateSendMarkAsSolutionInstructionsEnabled({
						channel: targetChannel,
						enabled,
						member,
						Error: (message) => oneTimeStatusHandler(interaction, message),
						Ok: (updatedChannel) => {
							updateChannelState(setChannel, updatedChannel);
						},
					});
				})
			}
		/>
	);
}

export const CLEAR_TAG_VALUE = 'clear';
const getTagNameWithEmoji = (tag: GuildForumTag) =>
	tag.emoji?.name ? `${tag.emoji.name} ${tag.name}` : tag.name;

function SelectMarkAsSolvedTag({
	channelInDB,
	setChannel,
	targetChannel,
}: ChannelSettingsMenuItemProps<ForumChannel>) {
	return (
		<Select
			placeholder={SET_SOLVED_TAG_ID_PLACEHOLDER}
			value={channelInDB.solutionTagId ?? ''}
			disabled={!channelInDB.flags.markSolutionEnabled}
			onChangeValue={async (value, interaction) => {
				await guildTextChannelOnlyInteraction(interaction, async ({ member }) =>
					setSolutionTagId({
						channel: targetChannel,
						tagId: value === CLEAR_TAG_VALUE ? null : value,
						member,
						Error: (message) => oneTimeStatusHandler(interaction, message),
						Ok: (updatedChannel) => {
							updateChannelState(setChannel, updatedChannel);
						},
					}),
				);
			}}
		>
			<Option
				label={
					targetChannel.availableTags.length > 0
						? CLEAR_TAG_LABEL
						: 'No Tags Found'
				}
				value={CLEAR_TAG_VALUE}
			/>
			{targetChannel.availableTags.map((tag) => (
				<Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
			))}
		</Select>
	);
}

function ToggleAutoThreadButton({
	channelInDB,
	setChannel,
	targetChannel,
}: ChannelSettingsMenuItemProps<TextChannel | NewsChannel>) {
	return (
		<ToggleButton
			currentlyEnabled={channelInDB.flags.autoThreadEnabled}
			disableLabel={DISABLE_AUTO_THREAD_LABEL}
			enableLabel={ENABLE_AUTO_THREAD_LABEL}
			// eslint-disable-next-line @typescript-eslint/no-misused-promises
			onClick={async (interaction, enabled) =>
				guildTextChannelOnlyInteraction(interaction, async ({ member }) => {
					await updateAutoThreadEnabled({
						channel: targetChannel,
						enabled,
						member,
						Error: (message) => oneTimeStatusHandler(interaction, message),
						Ok: (updatedChannel) => {
							updateChannelState(setChannel, updatedChannel);
						},
					});
				})
			}
		/>
	);
}

const getThreadOrPostText = (
	channel: TextChannel | NewsChannel | ForumChannel,
) => (channel.type === ChannelType.GuildForum ? 'thread' : 'post');

export function HelpChannelUtilitiesMenu({
	initialChannelData,
	targetChannel,
}: ChannelSettingsSubMenuProps) {
	const [channel, setChannel] = React.useState<ChannelWithFlags>(
		channelCache.get(targetChannel.id) ?? initialChannelData,
	);
	const props = { channelInDB: channel, setChannel, targetChannel };
	const isButtonInForumChannel = targetChannel.type === ChannelType.GuildForum;
	return (
		<>
			<InstructionsContainer>
				**Settings for {targetChannel.name}**
				<Spacer count={2} />
				<EmbedMenuInstruction
					instructions={[
						{
							title: ENABLE_MARK_AS_SOLUTION_LABEL,
							enabled: !channel.flags.markSolutionEnabled,
							instructions:
								'Questions in this channel will be able to be marked as solved. On Answer Overflow result page, those solutions will be highlighted',
						},
						{
							title: DISABLE_MARK_AS_SOLUTION_LABEL,
							enabled: channel.flags.markSolutionEnabled,
							instructions:
								'Questions in this channel will not be able to be marked as solved',
						},
						{
							title: ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
							enabled:
								!channel.flags.sendMarkSolutionInstructionsInNewThreads &&
								!isButtonInForumChannel,
							instructions: `When a new ${getThreadOrPostText(
								targetChannel,
							)} is created, a message will be sent to the thread with instructions on how to mark a solution`,
						},
						{
							title: DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL,
							enabled:
								channel.flags.sendMarkSolutionInstructionsInNewThreads &&
								!isButtonInForumChannel,
							instructions: `Mark solution instructions will no longer be sent in new ${getThreadOrPostText(
								targetChannel,
							)}s`,
						},
						{
							title: ENABLE_AUTO_THREAD_LABEL,
							enabled:
								!channel.flags.autoThreadEnabled && !isButtonInForumChannel,
							instructions:
								'A new thread will be created for every message in this channel',
						},
						{
							title: DISABLE_AUTO_THREAD_LABEL,
							enabled:
								channel.flags.autoThreadEnabled && !isButtonInForumChannel,
							instructions:
								'New threads will no longer be created for every message in this channel',
						},
						{
							title: SET_SOLVED_TAG_ID_PLACEHOLDER,
							enabled: isButtonInForumChannel,
							instructions: `When a question is marked as solved, this tag will added to the post`,
						},
					]}
				/>
			</InstructionsContainer>
			<ToggleMarkAsSolutionButton {...props} />
			<ToggleSendMarkAsSolutionInstructionsButton {...props} />
			{ALLOWED_AUTO_THREAD_CHANNEL_TYPES.has(targetChannel.type) && (
				<ToggleAutoThreadButton
					channelInDB={channel}
					setChannel={setChannel}
					targetChannel={targetChannel as TextChannel | NewsChannel}
				/>
			)}
			{isButtonInForumChannel && (
				<SelectMarkAsSolvedTag
					channelInDB={channel}
					setChannel={setChannel}
					targetChannel={targetChannel}
				/>
			)}
		</>
	);
}

function ExperimentalSettingsMenu() {
	return (
		<>
			<InstructionsContainer>
				**These features are experimental and may not work as expected.**
				<Spacer count={2} />
				**Some features may not be implemented yet, join the waitlist to be
				notified when they are.**
				<Spacer count={2} />
				<EmbedMenuInstruction
					instructions={[
						{
							title: ENABLE_REDIRECTION_TO_HELP_CHANNEL_LABEL,
							enabled: true,
							instructions:
								'Users will be redirected to use help channels when they ask a question in the wrong channel, i.e a general chat.',
						},
						{
							title: ENABLE_AI_QUESTION_ANSWERING_LABEL,
							enabled: true,
							instructions:
								"Users will receive a ChatGPT style AI answer to their question trained off your community's data.",
						},
						{
							title: ENABLE_AI_QUESTION_IMPROVEMENT_SUGGESTIONS_LABEL,
							enabled: true,
							instructions:
								'Users will receive instructions on how to improve their question to get a better answer.',
						},
					]}
				/>
			</InstructionsContainer>
			<Button
				label={ENABLE_REDIRECTION_TO_HELP_CHANNEL_LABEL}
				disabled={true}
				style="Secondary"
				onClick={() => {
					console.error(
						'Enable redirection to help channel not implemented yet',
					);
				}}
			/>
			<Button
				label={ENABLE_AI_QUESTION_ANSWERING_LABEL}
				disabled={true}
				style="Secondary"
				onClick={() => {
					console.error('Enable AI Question Answering not implemented yet');
				}}
			/>
			<Button
				label={ENABLE_AI_QUESTION_IMPROVEMENT_SUGGESTIONS_LABEL}
				disabled={true}
				style="Secondary"
				onClick={() => {
					console.error(
						'Enable AI Question Improvement Suggestions not implemented yet',
					);
				}}
			/>
			<ActionRow>
				{/* TODO: Swap with a button that responds ephemerally w/ the link for analytics */}
				<Link url={WAITLIST_URL} label="Join the waitlist" />
			</ActionRow>
		</>
	);
}

export function ChannelSettingsMenu({
	channelWithFlags,
	targetChannel,
	lastIndexedMessage,
}: {
	channelWithFlags: ChannelWithFlags;
	targetChannel: RootChannel;
	lastIndexedMessage: Message | null;
}) {
	const [channel] = React.useState<ChannelWithFlags>(
		channelCache.get(targetChannel.id) ?? channelWithFlags,
	);
	const { pushHistory } = useHistory();
	return (
		<>
			<InstructionsContainer>
				**Settings for {targetChannel.name}**
				<Spacer count={2} />
				<EmbedMenuInstruction
					instructions={[
						{
							title: OPEN_INDEXING_SETTINGS_MENU_LABEL,
							enabled: true,
							instructions:
								'Configure channel indexing and user consent settings',
						},
						{
							title: OPEN_HELP_CHANNEL_UTILITIES_LABEL,
							enabled: true,
							instructions: 'Configure utilities to improve asking questions',
						},
						{
							title: OPEN_EXPERIMENTAL_SETTINGS_LABEL,
							enabled: true,
							instructions: 'Configure experimental features',
						},
					]}
				/>
			</InstructionsContainer>
			<Button
				label={OPEN_INDEXING_SETTINGS_MENU_LABEL}
				style="Primary"
				onClick={() => {
					pushHistory(
						<IndexingSettingsMenu
							initialChannelData={channel}
							targetChannel={targetChannel}
							lastIndexedMessage={lastIndexedMessage}
						/>,
					);
				}}
			/>
			<Button
				label={OPEN_HELP_CHANNEL_UTILITIES_LABEL}
				style="Primary"
				onClick={() => {
					pushHistory(
						<HelpChannelUtilitiesMenu
							initialChannelData={channel}
							targetChannel={targetChannel}
						/>,
					);
				}}
			/>
			<Button
				label={OPEN_EXPERIMENTAL_SETTINGS_LABEL}
				style="Primary"
				onClick={() => {
					pushHistory(<ExperimentalSettingsMenu />);
				}}
			/>
		</>
	);
}
