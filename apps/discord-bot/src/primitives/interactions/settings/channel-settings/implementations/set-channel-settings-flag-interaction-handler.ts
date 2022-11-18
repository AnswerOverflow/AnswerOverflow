import {
  type ChannelSettingsWithBitfield,
  PermissionsBitField,
  ChannelSettingsFlags,
  Server,
  Channel,
  ChannelSettings,
} from "@answeroverflow/core";
import { getDefaultChannelSettings } from "@answeroverflow/core/dist/structures/channel-settings";
import { container } from "@sapphire/framework";
import type { GuildRootChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";
import { ChannelSettingsInteractionHandler } from "../channel-settings-interaction-handler";

export class SetChannelSettingsFlagInteractionHandler extends ChannelSettingsInteractionHandler {
  constructor(
    interaction: Interaction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    public readonly enable: boolean,
    // eslint-disable-next-line no-unused-vars
    public readonly flag: keyof typeof ChannelSettingsFlags
  ) {
    super(interaction);
  }

  protected async updateSettings(
    old_settings: ChannelSettingsWithBitfield | null,
    target_channel: GuildRootChannel,
    converted_channel: Channel,
    converted_server: Server
  ): Promise<ChannelSettingsWithBitfield> {
    let new_settings: ChannelSettings;
    if (old_settings) {
      new_settings = old_settings;
    } else {
      new_settings = getDefaultChannelSettings(target_channel.id);
    }
    const updated_permissions_bitfield = new PermissionsBitField(
      ChannelSettingsFlags,
      old_settings?.settings ?? 0
    );
    if (this.enable) {
      updated_permissions_bitfield.setFlag(this.flag);
    } else {
      updated_permissions_bitfield.clearFlag(this.flag);
    }
    new_settings.settings = updated_permissions_bitfield.value;
    return await container.answer_overflow.channel_settings.edit(
      converted_channel,
      converted_server,
      old_settings,
      new_settings
    );
  }
}
