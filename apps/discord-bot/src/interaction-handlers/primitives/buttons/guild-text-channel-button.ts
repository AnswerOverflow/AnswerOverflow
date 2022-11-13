import { addTargetChannelToInteraction } from "@utils/interactions/add-to-parse-data";
import type { ButtonInteraction } from "discord.js";
import { ButtonBaseHandler } from "./button-base";

export abstract class GuildTextChannelButtonHandler extends ButtonBaseHandler {
  public override async parse(interaction: ButtonInteraction) {
    const data = await super.parse(interaction);
    if (data.isNone()) return this.none();
    const interaction_with_target_channel = addTargetChannelToInteraction(
      interaction,
      data.unwrap()
    );
    return this.some(interaction_with_target_channel);
  }
}
