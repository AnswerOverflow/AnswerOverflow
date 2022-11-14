import { InvalidChannelError } from "@primitives/interactions/channel-settings/views/channel-settings/channel-settings-interaction-handler";
import { container } from "@sapphire/framework";
import { discordChannelToPrismaChannel, discordGuildToPrismaServer } from "@utils/conversion";
import type { GuildRootChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";

export function findRootChannel(interaction: Interaction<CacheType>) {
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

export function addRootChannelToInteraction<T extends {}>(interaction: Interaction, data: T) {
  try {
    const root_channel = findRootChannel(interaction);
    return { root_channel, ...data };
  } catch (error) {
    return null;
  }
}

export async function addChannelSettingsParseDataToInteraction<T extends {}>(
  target_channel: GuildRootChannel,
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
