import React from "react";
import { makeMemberAPICaller, makeChannelUpsert } from "@trpc/create-caller";
import type { ChannelSettingsOutput, ChannelSettingsUpsertInput } from "@answeroverflow/api";
import { ToggleButton } from "@reacord/components/toggle-button";
import {
  type ChatInputCommandInteraction,
  type GuildForumTag,
  type TextBasedChannel,
  ChannelType,
  PermissionsBitField,
  CacheType,
  Guild,
  GuildTextBasedChannel,
  SlashCommandBuilder,
} from "discord.js";
import { ApplyOptions } from "@sapphire/decorators";
import { ButtonClickEvent, Option, Select, SelectChangeEvent } from "reacord";
import { ChatInputCommand, Command } from "@sapphire/framework";

@ApplyOptions<Command.Options>({
  name: "channel-settings",
  description: "Configure channel settings",
  preconditions: ["GuildOnly"],
  runIn: ["GUILD_ANY"],
  requiredUserPermissions: ["ManageGuild"],
})
export class ChannelSettingsCommand extends Command {
  public getSlashCommandBuilder(): SlashCommandBuilder {
    return new SlashCommandBuilder()
      .setName(this.name)
      .setDescription(this.description)
      .setDMPermission(false)
      .setDefaultMemberPermissions(PermissionsBitField.resolve("ManageGuild"));
  }

  public override registerApplicationCommands(registry: ChatInputCommand.Registry) {
    registry.registerChatInputCommand(this.getSlashCommandBuilder());
  }
  public async guildChatInputRun(
    interaction: ChatInputCommandInteraction<CacheType>,
    guild: Guild,
    channel: GuildTextBasedChannel
  ): Promise<void> {
    const member = await guild.members.fetch(interaction.user.id);
    const api_caller = await makeMemberAPICaller(member);

    const settings = await api_caller.channel_settings.upsert({
      update: {},
      create: {
        channel: makeChannelUpsert(channel, guild),
      },
    });
    this.container.reacord.ephemeralReply(
      interaction,
      <ChannelSettingsMenu channel={channel} settings={settings} />
    );
  }

  public override async chatInputRun(
    interaction: ChatInputCommandInteraction,
    // eslint-disable-next-line no-unused-vars
    context: ChatInputCommand.RunContext
  ) {
    console.log(this.name);
    if (interaction.guild == null) {
      return;
    }
    if (!interaction.channel || interaction.channel.isDMBased()) {
      return;
    }
    if (interaction.channel.isVoiceBased()) {
      return;
    }
    await this.guildChatInputRun(interaction, interaction.guild, interaction.channel);
  }
}

const getTagNameWithEmoji = (tag: GuildForumTag) =>
  tag.emoji?.name ? tag.emoji.name + " " + tag.name : tag.name;

const CLEAR_TAG_VALUE = "clear";

function ChannelSettingsMenu({
  channel,
  settings,
}: {
  channel: TextBasedChannel;
  settings: ChannelSettingsOutput;
}) {
  const [channelSettings, setChannelSettings] = React.useState<ChannelSettingsOutput>(settings);
  const is_forum_channel = channel.isThread() && channel.parent?.type == ChannelType.GuildForum;

  const updateChannelSettings = async (
    interaction: ButtonClickEvent,
    data: ChannelSettingsUpsertInput["update"]
  ) => {
    if (channel.isDMBased()) {
      interaction.ephemeralReply("Does not work in DMs");
      return;
    }
    const member = await channel.guild.members.fetch(interaction.user.id);
    const api = await makeMemberAPICaller(member);
    const updated_settings = await api.channel_settings.upsert({
      update: data,
      create: {
        channel: {
          ...makeChannelUpsert(channel, channel.guild),
        },
      },
    });
    setChannelSettings(updated_settings);
  };
  return (
    <>
      <ToggleButton
        enable={channelSettings.flags.indexing_enabled}
        disable_label={"Disable Indexing"}
        enable_label={"Enable Indexing"}
        onClick={(interaction: ButtonClickEvent) => {
          void updateChannelSettings(interaction, {
            flags: {
              indexing_enabled: !channelSettings.flags.indexing_enabled,
            },
          });
        }}
      />
      <ToggleButton
        enable={channelSettings.flags.mark_solution_enabled}
        disable_label={"Disable Mark Solution"}
        enable_label={"Enable Mark Solution"}
        onClick={(interaction: ButtonClickEvent) => {
          void updateChannelSettings(interaction, {
            flags: {
              mark_solution_enabled: !channelSettings.flags.mark_solution_enabled,
            },
          });
        }}
      />
      <ToggleButton
        enable={channelSettings.flags.send_mark_solution_instructions_in_new_threads}
        disable_label={"Disable Send Mark Solution Instructions"}
        enable_label={"Enable Send Mark Solution Instructions"}
        onClick={(interaction: ButtonClickEvent) => {
          void updateChannelSettings(interaction, {
            flags: {
              send_mark_solution_instructions_in_new_threads:
                !channelSettings.flags.send_mark_solution_instructions_in_new_threads,
            },
          });
        }}
      />
      {is_forum_channel && (
        <Select
          placeholder="Select a tag to use on mark as solved"
          value={channelSettings.solution_tag_id ?? ""}
          onChangeValue={(value: string, event: SelectChangeEvent) => {
            const new_solved_tag = value == CLEAR_TAG_VALUE ? null : value;
            void updateChannelSettings(event, {
              solution_tag_id: new_solved_tag,
            });
          }}
        >
          <Option
            label={channel.parent.availableTags.length > 0 ? "(Clear)" : "No Tags Found"}
            value={CLEAR_TAG_VALUE}
          />
          {channel.parent.availableTags.map((tag) => (
            <Option label={getTagNameWithEmoji(tag)} value={tag.id} key={tag.id} />
          ))}
        </Select>
      )}
    </>
  );
}
