import type { Channel, ChannelSettingsWithBitfield, Server } from "@answeroverflow/core";
import { InteractionExecuteError } from "@primitives/interactions/interaction-executor";
import { container } from "@sapphire/framework";
import { findRootChannel } from "@utils/add-to-parse-data";
import { discordChannelToPrismaChannel, discordGuildToPrismaServer } from "@utils/conversion";
import type { GuildRootChannel } from "@utils/types";
import type { Interaction } from "discord.js";
import { SettingsInteractionHandler } from "../settings-interaction-handler";

export abstract class ChannelSettingsInteractionHandler extends SettingsInteractionHandler<ChannelSettingsWithBitfield> {
  constructor(interaction: Interaction) {
    super(interaction);
  }

  public async execute(): Promise<ChannelSettingsWithBitfield> {
    const target_channel = findRootChannel(this.interaction);
    if (target_channel == null) {
      throw new InteractionExecuteError("No channel found");
    }
    const old_settings = await container.answer_overflow.channel_settings.get({
      where: {
        channel_id: target_channel.id,
      },
    });
    const converted_channel = discordChannelToPrismaChannel(target_channel);
    const converted_server = discordGuildToPrismaServer(target_channel.guild);
    return await this.updateSettings(
      old_settings,
      target_channel,
      converted_channel,
      converted_server
    );
  }

  protected abstract updateSettings(
    // eslint-disable-next-line no-unused-vars
    old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    target_channel: GuildRootChannel,
    // eslint-disable-next-line no-unused-vars
    converted_channel: Channel,
    // eslint-disable-next-line no-unused-vars
    converted_server: Server
  ): Promise<ChannelSettingsWithBitfield>;
}
