import type { SettingsInteractionHandlerTypes } from "@utils/types";
import type { Interaction } from "discord.js";
import type { InteractionExecutor } from "../interaction-executor";

export abstract class SettingsInteractionHandler<T extends SettingsInteractionHandlerTypes>
  implements InteractionExecutor<T>
{
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly interaction: Interaction) {}
  public abstract execute(): Promise<T>;
}
