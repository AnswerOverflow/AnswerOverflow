import type { MessageSelectOptionData } from "discord.js";
import { SelectMenuBase } from "../select-menu-base";

export class MarkAsSolvedTagSelectMenu extends SelectMenuBase {
  public id: string = "mark-as-solved-tag-select-menu";
  public label: string = "Solved Tag";
  public options: MessageSelectOptionData[] = [];
  public constructor(tags: { label: string; value: string }[], placeholder?: string) {
    super();
    if (placeholder) {
      this.placeholder = placeholder;
    }
    this.options = tags.map((tag) => tag);
  }
}
