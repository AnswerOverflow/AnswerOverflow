import type { SettingsInteractionHandlerTypes } from "@utils/types";
import { ViewBase } from "./view-base";

export abstract class SettingsMenuView<T extends SettingsInteractionHandlerTypes> extends ViewBase {
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly settings: T) {
    super();
  }
}
