export const MANAGE_ACCOUNT_SOURCES = ["manage-account-menu"] as const;
export type ManageAccountSource = (typeof MANAGE_ACCOUNT_SOURCES)[number];

export const CONSENT_SOURCES = [
  "forum-post-guidelines",
  "read-the-rules",
  "manage-account-menu",
  "slash-command",
  "mark-solution-response",
  "disable-indexing-button",
] as const;

export type ConsentSource = (typeof CONSENT_SOURCES)[number];

export const CONSENT_ALREADY_GRANTED_MESSAGE = "You have already granted consent for this server";
export const CONSENT_ALREADY_DENIED_MESSAGE = "You have already denied consent for this server";
export const CONSENT_EXPLICITLY_SET_MESSAGE = "Consent has been explicitly set for this server";
export const CONSENT_PREVENTED_BY_DISABLED_INDEXING_MESSAGE =
  "You have disabled message indexing for this server, please enable it first to grant consent";
export const MESSAGE_INDEXING_ALREADY_DISABLED_MESSAGE =
  "Message indexing is already disabled for this server";
export const MESSAGE_INDEXING_ALREADY_ENABLED_MESSAGE =
  "Message indexing is already enabled for this server";
