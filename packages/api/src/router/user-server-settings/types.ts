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
