import type { PermissionFlagsBits } from "discord-api-types/v10";

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
