import { addRootChannelToInteraction } from "@utils/add-to-parse-data";
import type { MessageComponentInteraction } from "discord.js";
import { InteractionBase } from "./interaction-base";

export abstract class GuildTextChannelButtonHandler extends InteractionBase {
  public override async parse(interaction: MessageComponentInteraction) {
    const data = await super.parse(interaction);
    if (data.isNone()) return this.none();
    const interaction_with_target_channel = addRootChannelToInteraction(interaction, data.unwrap());
    if (!interaction_with_target_channel) return this.none();
    return this.some(interaction_with_target_channel);
  }
}
