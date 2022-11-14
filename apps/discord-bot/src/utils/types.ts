import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import type { NewsChannel, TextChannel } from "discord.js";

export type GuildRootChannel = NewsChannel | TextChannel;
export type SettingsInteractionHandlerTypes = ChannelSettingsWithBitfield;
