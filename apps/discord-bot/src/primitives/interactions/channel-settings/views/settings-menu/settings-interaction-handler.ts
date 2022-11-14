import type { SettingsInteractionHandlerTypes } from "@utils/types";
import type { CacheType, Interaction } from "discord.js";

export interface SettingsInteractionHandler<T extends SettingsInteractionHandlerTypes> {
  updateSettings(
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<T>;
}
