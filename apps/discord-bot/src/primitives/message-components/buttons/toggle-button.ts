import type { MessageButton } from "discord.js";
import type { ButtonCreator, ButtonBase } from "./button";

export abstract class ToggleButton implements ButtonCreator {
  public abstract enable: ButtonBase;
  public abstract disable: ButtonBase;
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly already_enabled: boolean) {}
  makeButton(): MessageButton {
    return this.already_enabled ? this.disable.makeButton() : this.enable.makeButton();
  }
}
