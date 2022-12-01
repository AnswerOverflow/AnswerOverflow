import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import type {
  NewsChannel,
  PrivateThreadChannel,
  PublicThreadChannel,
  TextChannel,
} from "discord.js";

export type GuildRootChannel = NewsChannel | TextChannel;
export type SettingsInteractionHandlerTypes = ChannelSettingsWithBitfield;
export type GuildTextChannel =
  | NewsChannel
  | TextChannel
  | PrivateThreadChannel
  | PublicThreadChannel<boolean>;
