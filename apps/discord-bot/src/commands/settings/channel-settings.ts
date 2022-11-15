import type { ChannelSettingsWithBitfield } from "@answeroverflow/core";
import { getDefaultChannelSettings } from "@answeroverflow/core/dist/structures/channel-settings";
import { OpenSettingsMenuCommand } from "@primitives/commands/settings/open-settings-menu";
import { ChannelSettingsMenuView } from "@primitives/views/channel-settings-view";
import type { SettingsMenuView } from "@primitives/views/settings-view";
import { ApplyOptions } from "@sapphire/decorators";
import type { Command } from "@sapphire/framework";
import type { GuildRootChannel } from "@utils/types";
import type { PermissionString } from "discord.js";

@ApplyOptions<Command.Options>({
  name: "channel-settings",
  description:
    "Adjust settings for the current channel. Allows you to enable indexing, mark as solution, etc.",
  requiredUserPermissions: ["MANAGE_GUILD"],
  requiredClientPermissions: ["CREATE_INSTANT_INVITE"],
})
export class ChannelSettings extends OpenSettingsMenuCommand<ChannelSettingsWithBitfield> {
  public default_permission: PermissionString = "MANAGE_GUILD";
  public async getMenu(
    root_channel: GuildRootChannel
  ): Promise<SettingsMenuView<ChannelSettingsWithBitfield>> {
    let settings = await this.container.answer_overflow.channel_settings.get({
      where: {
        channel_id: root_channel.id,
      },
    });
    if (settings == null) {
      settings = getDefaultChannelSettings(root_channel.id);
    }
    return new ChannelSettingsMenuView(settings, root_channel);
  }
}
