import {
  ActionRowBuilder,
  ComponentType,
  MessageActionRowComponentBuilder,
  StringSelectMenuBuilder,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { type ChatInputCommand, Command } from "@sapphire/framework";
import {
  ApplicationCommandType,
  ContextMenuCommandInteraction,
  StringSelectMenuOptionBuilder,
} from "discord.js";
import { makeDismissButton } from "../domains/dismiss-button";
import { memberToAnalyticsUser, trackDiscordEvent } from "../utils/analytics";
import { findAllChannelsByServerId } from "@answeroverflow/core/channel";

// credit to https://github.com/rafaelalmeidatk/nextjs-forum for the inspiration
@ApplyOptions<Command.Options>({
  runIn: ["GUILD_ANY"],
})
export class QuickAction extends Command {
  public override registerApplicationCommands(
    registry: ChatInputCommand.Registry
  ) {
    registry.registerContextMenuCommand({
      name: "Quick Action",
      type: ApplicationCommandType.Message,
      dmPermission: false,
    });
  }
  public override async contextMenuRun(
    interaction: ContextMenuCommandInteraction
  ) {
    if (!interaction.channel) return;
    const targetMessage = await interaction.channel.messages.fetch(
      interaction.targetId
    );
    if (!targetMessage) return;
    if (!interaction.member) return;

    const actionRow = new ActionRowBuilder<MessageActionRowComponentBuilder>();
    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("replyWithIssue")
      .setPlaceholder("Choose the response that will be the most help");

    actionRow.addComponents(selectMenu);
    const option = new StringSelectMenuOptionBuilder()
      .setLabel("Use help channels")
      .setValue("use-help-channels");

    option.setDescription("Redirects user to the help channels");

    selectMenu.addOptions(option);

    const interactionReply = await interaction.reply({
      ephemeral: true,
      content: "Select an action to perform on this message.",
      components: [actionRow],
    });

    await interactionReply.awaitMessageComponent({
      componentType: ComponentType.StringSelect,
      time: 5 * 60 * 1000, // 5 minutes (more than enough time)
      filter: (i) => i.user.id === interaction.user.id,
    });

    const requestor = interaction.user;
    const requestorAsMember = interaction.inCachedGuild()
      ? interaction.member
      : null;

    const guildId = interaction.guildId;

    if (!guildId) return;
    const allServerChannels = await findAllChannelsByServerId(guildId);
    const indexedChannels = allServerChannels.filter(
      (channel) => channel.flags.indexingEnabled
    );

    const channelsTargetAuthorCanSee = await Promise.all(
      indexedChannels.map(async (channel) => {
        const discordChannel = await interaction.guild!.channels.fetch(
          channel.id
        );
        if (!discordChannel) return null;
        if (!targetMessage.author) return null;
        const author = targetMessage.author;
        const authorMember = await interaction.guild!.members.fetch(author.id);
        if (!authorMember) return null;
        if (
          discordChannel.permissionsFor(authorMember)?.has("ViewChannel") &&
          discordChannel.permissionsFor(authorMember)?.has("SendMessages")
        ) {
          return channel;
        }
        return null;
      })
    ).then((channels) => channels.filter(Boolean));

    await targetMessage.reply({
      components: [
        new ActionRowBuilder<MessageActionRowComponentBuilder>().addComponents(
          makeDismissButton(interaction.user.id)
        ),
      ],
      embeds: [
        {
          title: "Post in another channel",
          description: `Hey <@${
            targetMessage.author.id
          }>! It looks like this may not be the right channel for this, please copy your message into one of the following channels:\n
					${channelsTargetAuthorCanSee
            .map((channel) => `- <#${channel.id}>`)
            .join(
              "\n"
            )}\n\nThis helps to keep discussions organized and allows others to find your post.`,
          footer: {
            text: `Requested by ${
              requestorAsMember?.displayName || requestor.username
            }`,
            icon_url:
              requestorAsMember?.displayAvatarURL() ||
              requestor.displayAvatarURL(),
          },
        },
      ],
    });
    void interaction.deleteReply();
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const userProps = memberToAnalyticsUser("User", member!);
    trackDiscordEvent("Quick Action Command Sent", {
      ...userProps,
      "Answer Overflow Account Id": interaction.user.id,
    });
  }
}
