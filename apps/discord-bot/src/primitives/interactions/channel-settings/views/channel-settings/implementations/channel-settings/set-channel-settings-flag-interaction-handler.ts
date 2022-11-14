import {
  type ChannelSettingsWithBitfield,
  PermissionsBitField,
  ChannelSettingsFlags,
  Server,
  Channel,
  ChannelSettings,
} from "@answeroverflow/core";
import { container } from "@sapphire/framework";
import type { GuildRootChannel } from "@utils/types";
import type { Interaction, CacheType } from "discord.js";
import { ChannelSettingsInteractionHandler } from "../../channel-settings-interaction-handler";

export class SetChannelSettingsFlagInteractionHandler extends ChannelSettingsInteractionHandler {
  constructor(
    // eslint-disable-next-line no-unused-vars
    public readonly target_channel: GuildRootChannel,
    // eslint-disable-next-line no-unused-vars
    public readonly converted_channel: Channel,
    // eslint-disable-next-line no-unused-vars
    public readonly converted_server: Server,
    // eslint-disable-next-line no-unused-vars
    public readonly old_settings: ChannelSettingsWithBitfield | null,
    // eslint-disable-next-line no-unused-vars
    public readonly enable: boolean,
    // eslint-disable-next-line no-unused-vars
    public readonly flag: keyof typeof ChannelSettingsFlags
  ) {
    super(target_channel, converted_channel, converted_server, old_settings);
  }

  public async updateSettings(
    // eslint-disable-next-line no-unused-vars
    interaction: Interaction<CacheType>
  ): Promise<ChannelSettingsWithBitfield> {
    let new_settings: ChannelSettings;
    if (this.old_settings) {
      new_settings = this.old_settings;
    } else {
      new_settings = {
        channel_id: this.converted_channel.id,
        invite_code: null,
        last_indexed_snowflake: null,
        permissions: 0,
        solution_tag_id: null,
      };
    }
    const updated_permissions_bitfield = new PermissionsBitField(
      ChannelSettingsFlags,
      this.old_settings?.permissions ?? 0
    );
    if (this.enable) {
      updated_permissions_bitfield.setFlag(this.flag);
    } else {
      updated_permissions_bitfield.clearFlag(this.flag);
    }
    new_settings.permissions = updated_permissions_bitfield.value;
    return await container.answer_overflow.channel_settings.edit(
      this.converted_channel,
      this.converted_server,
      this.old_settings,
      new_settings
    );
  }
}
