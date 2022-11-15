import { findRootChannel } from "@utils/add-to-parse-data";
import type { MessageComponentInteraction } from "discord.js";
import { InteractionBase } from "./interaction-base";

export abstract class GuildTextChannelButtonHandler extends InteractionBase {
  public override async parse(interaction: MessageComponentInteraction) {
    const data = await super.parse(interaction);
    if (data.isNone()) return this.none();
    const root_channel = findRootChannel(interaction);
    if (root_channel == null) return this.none();
    return this.some({ ...data.unwrap(), root_channel });
  }
}
