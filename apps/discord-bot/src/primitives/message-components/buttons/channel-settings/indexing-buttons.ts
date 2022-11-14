import type { MessageButtonStyleResolvable } from "discord.js";
import { ButtonBase } from "../button";
import { ToggleButton } from "../toggle-button";

export class DisableIndexingButton extends ButtonBase {
  public id = "disable-indexing";
  public label = "Disable Indexing";
  public style = "DANGER" as MessageButtonStyleResolvable;
}

export class EnableIndexingButton extends ButtonBase {
  public id = "enable-indexing";
  public label = "Enable Indexing";
  public style = "SUCCESS" as MessageButtonStyleResolvable;
}

export class ToggleIndexingButton extends ToggleButton {
  constructor(is_already_enabled: boolean) {
    super(is_already_enabled, new EnableIndexingButton(), new DisableIndexingButton());
  }
}
