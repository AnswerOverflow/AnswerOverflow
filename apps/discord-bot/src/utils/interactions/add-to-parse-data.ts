import { InvalidChannelError } from "@interaction-handlers/channel-settings/buttons/channel-setting-button-base";
import { container } from "@sapphire/framework";
import { discordChannelToPrismaChannel, discordGuildToPrismaServer } from "@utils/conversion";
import type { GuildTextChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";

function findSettingsTargetChannel(interaction: Interaction<CacheType>) {
  if (interaction.channel == null) {
    throw new InvalidChannelError("Could not find a channel to update settings for");
  }
  if (!interaction.channel.isText()) {
    throw new InvalidChannelError("Channel is not a text channel, cannot update settings for it");
  }
  if (interaction.channel.type === "DM") {
    throw new InvalidChannelError("Cannot update settings for a DM channel");
  }
  if (interaction.channel.isThread()) {
    if (interaction.channel.parent == null) {
      throw new InvalidChannelError("Could not find a parent channel for this thread");
    }
    return interaction.channel.parent;
  }
  if (interaction.channel.isVoice()) {
    throw new InvalidChannelError("Cannot update settings for a voice channel");
  }
  return interaction.channel;
}

export function addTargetChannelToInteraction<T extends {}>(interaction: Interaction, data: T) {
  const parent_channel = findSettingsTargetChannel(interaction);
  return { parent_channel, ...data };
}

export async function addChannelSettingsParseDataToInteraction<T extends {}>(
  target_channel: GuildTextChannel,
  data: T
) {
  const converted_channel = discordChannelToPrismaChannel(target_channel);
  const converted_server = discordGuildToPrismaServer(target_channel.guild);
  const old_settings = await container.answer_overflow.channel_settings.get({
    where: {
      channel_id: target_channel.id,
    },
  });
  return {
    ...data,
    old_settings,
    converted_channel,
    converted_server,
  };
}
