import { findRootChannel } from "@utils/add-to-parse-data";
import type { MessageComponentInteraction } from "discord.js";
import { MessageComponentHandler } from "./message-component-handler";

export abstract class GuildTextChannelMessageComponentHandler extends MessageComponentHandler {
  public override async parse(interaction: MessageComponentInteraction) {
    const data = await super.parse(interaction);
    if (data.isNone()) return this.none();
    const root_channel = findRootChannel(interaction);
    if (root_channel == null) return this.none();
    return this.some({ ...data.unwrap(), root_channel });
  }
}
