import type {
  NewsChannel,
  PrivateThreadChannel,
  PublicThreadChannel,
  TextChannel,
} from "discord.js";

export type GuildRootChannel = NewsChannel | TextChannel;
export type GuildTextChannel =
  | NewsChannel
  | TextChannel
  | PrivateThreadChannel
  | PublicThreadChannel<boolean>;
