import type { MessageButtonStyleResolvable } from "discord.js";
import { ButtonBase } from "../button";
import { ToggleButton } from "../toggle-button";

export class DisableMarkSolutionPromptButton extends ButtonBase {
  public id = "disable-mark-solution-prompt";
  public label = "Disable Mark Solution Prompt";
  public style = "DANGER" as MessageButtonStyleResolvable;
  constructor(is_mark_solution_enabled: boolean) {
    super();
    this.disabled = !is_mark_solution_enabled;
  }
}

export class EnableMarkSolutionPromptButton extends ButtonBase {
  public id = "enable-mark-solution-prompt";
  public label = "Enable Mark Solution Prompt";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
  constructor(is_mark_solution_enabled: boolean) {
    super();
    this.disabled = !is_mark_solution_enabled;
  }
}

export class ToggleMarkSolutionPromptButton extends ToggleButton {
  constructor(is_already_enabled: boolean, is_mark_solution_enabled: boolean) {
    super(
      is_already_enabled,
      new EnableMarkSolutionPromptButton(is_mark_solution_enabled),
      new DisableMarkSolutionPromptButton(is_mark_solution_enabled)
    );
  }
}
