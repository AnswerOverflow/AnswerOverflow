import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { ToggleIndexingButton } from "@primitives/message-components/buttons/channel-settings/indexing-buttons";
import { ToggleMarkSolutionButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-buttons";
import { ToggleMarkSolutionPromptButton } from "@primitives/message-components/buttons/channel-settings/mark-solution-prompt-instructions";
import { MarkAsSolvedTagSelectMenu } from "@primitives/message-components/select-menu/channel-settings/mark-as-solved-tag-select-menu";
import { MessageActionRow, MessageButton, MessageSelectMenu } from "discord.js";
import { SettingsMenuView } from "./settings-view";

type ButtonsWithDescription = {
  buttons: MessageButton[] | MessageSelectMenu[];
  descriptions: string[];
};

export class ChannelSettingsMenuView extends SettingsMenuView<ChannelSettingsWithBitfield> {
  public getIndexingButtons(): ButtonsWithDescription {
    const content: string[] = [];
    const indexing_enabled = this.settings.bitfield.checkFlag("INDEXING_ENABLED");
    const toggle_indexing_button = new ToggleIndexingButton(
      this.settings.bitfield.checkFlag("INDEXING_ENABLED")
    ).makeButton();
    if (indexing_enabled) {
      content.push("**Disable Indexing** - Disables messages being indexed from this channel");
    } else {
      content.push(
        "**Enable Indexing** - Enables messages from this channel to be indexed and appear on Answer Overflow"
      );
    }
    return {
      buttons: [toggle_indexing_button],
      descriptions: content,
    };
  }

  public getMarkSolutionButtons(): ButtonsWithDescription {
    const content: string[] = [];

    // Mark Solution
    const mark_solution_enabled = this.settings.bitfield.checkFlag("MARK_SOLUTION_ENABLED");

    const toggle_mark_solution_button = new ToggleMarkSolutionButton(
      mark_solution_enabled
    ).makeButton();
    if (mark_solution_enabled) {
      content.push("**Disable Mark As Solution** - Turns off mark as solution for this channel");
    } else {
      content.push("**Enable Mark As Solution** - Enables users to mark their questions as solved");
    }

    const mark_solution_prompt_enabled = this.settings.bitfield.checkFlag(
      "SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS"
    );
    const toggle_prompt_mark_solution_button = new ToggleMarkSolutionPromptButton(
      mark_solution_prompt_enabled,
      mark_solution_enabled
    ).makeButton();

    if (mark_solution_prompt_enabled) {
      content.push(
        "**Disable Mark Solution Prompt** - Turns off the mark solution prompt for this channel"
      );
    } else {
      content.push(
        "**Enable Mark Solution Prompt** - Enables the mark solution prompt for this channel"
      );
    }
    return {
      descriptions: content,
      buttons: [toggle_mark_solution_button, toggle_prompt_mark_solution_button],
    };
  }

  public async getView() {
    const message_buttons: MessageActionRow[] = [];
    const settings_buttons = new MessageActionRow();
    let content: string[] = [];
    const indexing_buttons = this.getIndexingButtons();
    const mark_solution_buttons = this.getMarkSolutionButtons();

    settings_buttons.addComponents([...indexing_buttons.buttons, ...mark_solution_buttons.buttons]);
    content = content.concat(indexing_buttons.descriptions, mark_solution_buttons.descriptions);
    message_buttons.push(settings_buttons);
    if (this.root_channel.type == "GUILD_TEXT") {
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
      message_buttons.push(forum_tag_row);
    }
    return {
      components: message_buttons,
      content: content.join("\n\n"),
    };
  }
}
