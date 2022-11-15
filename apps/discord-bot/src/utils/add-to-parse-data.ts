import type { Interaction, CacheType } from "discord.js";

export function findRootChannel(interaction: Interaction<CacheType>) {
  if (interaction.channel == null) {
    return null;
  }
  if (!interaction.channel.isText()) {
    return null;
  }
  if (interaction.channel.type === "DM") {
    return null;
  }
  if (interaction.channel.isThread()) {
    if (interaction.channel.parent == null) {
      return null;
    }
    return interaction.channel.parent;
  }
  if (interaction.channel.isVoice()) {
    return null;
  }
  return interaction.channel;
}
