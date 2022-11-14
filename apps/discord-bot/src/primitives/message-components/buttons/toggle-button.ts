import type { MessageButton } from "discord.js";
import type { ButtonCreator, ButtonBase } from "./button";

export abstract class ToggleButton implements ButtonCreator {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly already_enabled: boolean,
    // eslint-disable-next-line no-unused-vars
    private enable: ButtonBase,
    // eslint-disable-next-line no-unused-vars
    private disable: ButtonBase
  ) {}
  makeButton(): MessageButton {
    return this.already_enabled ? this.disable.makeButton() : this.enable.makeButton();
  }
}
