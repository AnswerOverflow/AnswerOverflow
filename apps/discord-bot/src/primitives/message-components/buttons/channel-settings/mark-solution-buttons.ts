import type { MessageButtonStyleResolvable } from "discord.js";
import { ButtonBase } from "../button";
import { ToggleButton } from "../toggle-button";

export class DisableMarkSolutionButton extends ButtonBase {
  public id = "disable-mark-solution";
  public label = "Disable Mark Solution";
  public style = "DANGER" as MessageButtonStyleResolvable;
}

export class EnableMarkSolutionButton extends ButtonBase {
  public id = "enable-mark-solution";
  public label = "Enable Mark Solution";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

export class ToggleMarkSolutionButton extends ToggleButton {
  public enable = new EnableMarkSolutionButton();
  public disable = new DisableMarkSolutionButton();
}
