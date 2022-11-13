import { InteractionHandler } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import type { MessageComponentInteraction } from "discord.js";

export interface InteractionDisplay {
  getId(): string;
}

export abstract class InteractionBase extends InteractionHandler {
  public abstract display: InteractionDisplay;
  protected checkIfIdMatches(interaction: MessageComponentInteraction) {
    if (isNullishOrEmpty(this.display)) return false;
    if (!interaction.customId.startsWith(this.display.getId())) return false;
    return true;
  }

  // eslint-disable-next-line no-unused-vars
  public override async parse(interaction: MessageComponentInteraction) {
    if (!this.checkIfIdMatches(interaction)) return this.none();
    return this.some({});
  }
}
