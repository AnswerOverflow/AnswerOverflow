import type { ComponentEvent } from "@answeroverflow/reacord";
import { container } from "@sapphire/framework";
import type {
  Channel,
  Guild,
  GuildMember,
  GuildTextBasedChannel,
  Interaction,
  User,
} from "discord.js";
import { componentEventToDiscordJSTypes } from "./conversions";

export async function guildTextChannelOnlyInteraction<T>(
  interaction: Interaction,
  operation: ({
    guild,
    channel,
    member,
  }: {
    guild: Guild;
    channel: GuildTextBasedChannel;
    member: GuildMember;
  }) => Promise<T>
) {
  if (interaction.guild == null) {
    return;
  }
  if (!interaction.channel || interaction.channel.isDMBased()) {
    return;
  }
  if (interaction.channel.isVoiceBased()) {
    return;
  }
  const guild = interaction.guild;
  const channel = interaction.channel;
  const member = await interaction.guild.members.fetch(interaction.user.id);
  await operation({
    guild,
    channel,
    member,
  });
}

export async function guildOnlyComponentEvent(
  event: ComponentEvent,
  operation: (
    data: {
      guild: Guild;
      user: User;
      channel: Channel;
      member: GuildMember;
    } & Pick<ComponentEvent, "ephemeralReply" | "reply">
  ) => Promise<unknown> | unknown
) {
  const result = await componentEventToDiscordJSTypes(event, container.client);
  if (result.guild == null) {
    return;
  }
  const member = await result.guild.members.fetch(result.user.id);
  await operation({
    ...result,
    guild: result.guild,
    member,
  });
  return result;
}
