import type { MessageSelectOptionData } from "discord.js";
import { SelectMenuBase } from "../select-menu-base";

export class MarkAsSolvedTagSelectMenu extends SelectMenuBase {
  public id: string = "mark-as-solved-tag-select-menu";
  public label: string = "Solved Tag";
  public options: MessageSelectOptionData[] = [];
  public constructor(tags: { label: string; value: string }[], placeholder?: string | null) {
    super();
    if (placeholder) {
      this.placeholder = tags.find((tag) => tag.value === placeholder)?.label ?? placeholder;
    } else {
      this.placeholder = "Select a Solved Tag";
    }
    this.options = tags.map((tag) => tag);
  }
}
