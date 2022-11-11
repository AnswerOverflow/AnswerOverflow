import { ToggleButton } from "@interaction-handlers/primitives/toggle-button";
import { DisableMarkSolutionButton } from "./disable-mark-solution-button";
import { EnableMarkSolutionButton } from "./enable-mark-solution-button";

export class ToggleMarkSolutionButton extends ToggleButton {
  public enable = new EnableMarkSolutionButton();
  public disable = new DisableMarkSolutionButton();
}
