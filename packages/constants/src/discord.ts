import { ChannelType, PermissionFlagsBits } from "discord-api-types/v10";

// keys of PermissionFlagsBits as a string
export type DiscordPermissions = keyof typeof PermissionFlagsBits;

export const ENABLE_CHANNEL_INDEXING_LABEL = "Enable indexing";
export const DISABLE_CHANNEL_INDEXING_LABEL = "Disable indexing";
export const ENABLE_FORUM_GUIDELINES_CONSENT_LABEL = "Enable forum guidelines consent";
export const DISABLE_FORUM_GUIDELINES_CONSENT_LABEL = "Disable forum guidelines consent";
export const REVOKE_CONSENT_LABEL = "Disable publicly showing messages";
export const GRANT_CONSENT_LABEL = "Publicly display messages on Answer Overflow";
export const DISABLE_INDEXING_LABEL = "Ignore account in server";
export const ENABLE_INDEXING_LABEL = "Enable indexing of messages in server";
export const GLOBALLY_IGNORE_ACCOUNT_LABEL = "Globally ignore account";
export const STOP_IGNORING_ACCOUNT_LABEL = "Stop ignoring account";

export const ENABLE_READ_THE_RULES_CONSENT_LABEL = "Enable read the rules consent";
export const DISABLE_READ_THE_RULES_CONSENT_LABEL = "Disable read the rules consent";
export const VIEW_ON_ANSWEROVERFLOW_LABEL = "View on Answer Overflow";
export const FORUM_GUIDELINES_CONSENT_PROMPT =
  "This server uses Answer Overflow to index content on the web. By posting in this channel your messages will be indexed on the web to help others find answers.";
export const FORUM_GUIDELINES_CONSENT_MISSING_ERROR_MESSAGE = `You must add the consent prompt to the channel forum guidelines to enable this setting: \n\n\`${FORUM_GUIDELINES_CONSENT_PROMPT}\`\n\nIs this not detecting properly? Please join the Discord for support!`;
export const READ_THE_RULES_CONSENT_PROMPT =
  "This server uses Answer Overflow to index content on the web. By posting in indexed channels, you agree to have your messages publicly displayed on Answer Overflow to help others find answers.";

export const CONSENT_BUTTON_LABEL = "Publicly display my messages on Answer Overflow";
export const PERMISSIONS_ALLOWED_TO_MARK_AS_SOLVED: DiscordPermissions[] = [
  "Administrator",
  "ManageChannels",
  "ManageThreads",
  "ManageGuild",
];
export const QUESTION_ID_FIELD_NAME = "Question Message ID";
export const SOLUTION_ID_FIELD_NAME = "Solution Message ID";
export const ANSWER_OVERFLOW_BLUE_HEX = "#8CD1FF";
export const ANSWER_OVERFLOW_BLUE_AS_INT = parseInt(ANSWER_OVERFLOW_BLUE_HEX.replace("#", "0x"));
export const DISABLE_MARK_AS_SOLUTION_LABEL = "Disable mark as solution";
export const ENABLE_MARK_AS_SOLUTION_LABEL = "Enable mark as solution";
export const ENABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL =
  "Enable send mark as solution in new thread";
export const DISABLE_SEND_MARK_AS_SOLUTION_INSTRUCTIONS_LABEL =
  "Disable send mark as solution in new thread";
export const ENABLE_AUTO_THREAD_LABEL = "Enable auto thread";
export const DISABLE_AUTO_THREAD_LABEL = "Disable auto thread";
export const SET_SOLVED_TAG_ID_PLACEHOLDER = "Select a tag to use on mark as solved";
export const ALLOWED_AUTO_THREAD_CHANNEL_TYPES = new Set([
  ChannelType.GuildText,
  ChannelType.GuildAnnouncement,
] as const);
export const ENABLE_REDIRECTION_TO_HELP_CHANNEL_LABEL = "Enable redirection to help channel";
export const ENABLE_AI_QUESTION_ANSWERING_LABEL = "Enable AI question answering";
export const ENABLE_AI_QUESTION_IMPROVEMENT_SUGGESTIONS_LABEL =
  "Enable AI question improvement suggestions";
export const OPEN_INDEXING_SETTINGS_MENU_LABEL = "Indexing settings";
export const OPEN_HELP_CHANNEL_UTILITIES_LABEL = "Help channel utilities";
export const OPEN_EXPERIMENTAL_SETTINGS_LABEL = "Experimental settings";
export const EXPERIMENTAL_SETTINGS_WAITLIST_URL = "https://forms.gle/UaKs8CcYsnRWwmpY8";
export const SEND_CONSENT_PROMPT_LABEL = "Send consent prompt";
export const CLEAR_TAG_LABEL = "(Clear)";
