import { type MessageButtonStyleResolvable, MessageButton } from "discord.js";
import type { InteractionDisplay } from "@primitives/interactions/interaction-base";

export interface ButtonCreator {
  makeButton(): MessageButton;
}

export abstract class ButtonBase implements ButtonCreator, InteractionDisplay {
  public abstract id: string;
  public abstract label: string;
  public abstract style: MessageButtonStyleResolvable;
  public makeButton() {
    return new MessageButton().setCustomId(this.id).setLabel(this.label).setStyle(this.style);
  }
  public getId() {
    return this.id;
  }
}
