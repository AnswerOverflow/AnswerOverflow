import { ToggleButton } from "@interaction-handlers/primitives/toggle-button";
import { DisableIndexingButton } from "./disable-indexing-button";
import { EnableIndexingButton } from "./enable-indexing-button";

export class ToggleIndexingButton extends ToggleButton {
  public enable = new EnableIndexingButton();
  public disable = new DisableIndexingButton();
}
