import type { GuildMember } from "discord.js";

export const MANAGE_ACCOUNT_SOURCES = ["manage-account-menu"];
export type ManageAccountSource = (typeof MANAGE_ACCOUNT_SOURCES)[number];
