import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { ToggleIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";
import { ToggleMarkSolutionButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-buttons";
import { MarkAsSolvedTagSelectMenu } from "@primitives/message-components/select-menu/channel-settings/mark-as-solved-tag-select-menu";
import { MessageActionRow } from "discord.js";
import { SettingsMenuView } from "./settings-view";

export class ChannelSettingsMenuView extends SettingsMenuView<ChannelSettingsWithBitfield> {
  public async getContent() {
    const content: string[] = [];
    if (this.settings.bitfield.checkFlag("INDEXING_ENABLED")) {
      content.push("**Disable Indexing** - Disables messages being indexed from this channel");
    } else {
      content.push(
        "**Enable Indexing** - Enables messages from this channel to be indexed and appear on Answer Overflow"
      );
    }
    if (this.settings.bitfield.checkFlag("MARK_SOLUTION_ENABLED")) {
      content.push("**Disable Mark As Solution** - Turns off mark as solution for this channel");
    } else {
      content.push("**Enable Mark As Solution** - Enables users to mark their questions as solved");
    }
    return content.join("\n\n");
  }
  public async getActionRows() {
    const settings_buttons = new MessageActionRow();
    settings_buttons.addComponents([
      new ToggleIndexingButton(this.settings.bitfield.checkFlag("INDEXING_ENABLED")).makeButton(),
      new ToggleMarkSolutionButton(
        this.settings.bitfield.checkFlag("MARK_SOLUTION_ENABLED")
      ).makeButton(),
    ]);
    const forum_tag_row = new MessageActionRow().addComponents([
      new MarkAsSolvedTagSelectMenu(
        [
          {
            label: "✅ Solved",
            value: "1",
          },
          {
            label: "Typescript",
            value: "2",
          },
        ],
        this.settings.solution_tag_id
      ).makeSelectMenu(),
    ]);
    return [settings_buttons, forum_tag_row];
  }
}
