import { type MessageButtonStyleResolvable, MessageButton } from "discord.js";
import type { InteractionDisplay } from "@primitives/interactions/interaction-base";

export interface ButtonCreator {
  makeButton(): MessageButton;
}

export abstract class ButtonBase implements ButtonCreator, InteractionDisplay {
  public abstract id: string;
  public abstract label: string;
  public abstract style: MessageButtonStyleResolvable;
  public disabled: boolean = false;
  public disabled_style: MessageButtonStyleResolvable = "SECONDARY";
  public makeButton() {
    const button = new MessageButton()
      .setCustomId(this.id)
      .setLabel(this.label)
      .setStyle(this.style);
    if (this.disabled) {
      button.setStyle(this.disabled_style).setDisabled(true);
    }
    return button;
  }
  public getId() {
    return this.id;
  }
}
