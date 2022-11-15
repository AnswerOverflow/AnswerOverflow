import type { SettingsMenuView } from "@primitives/views/settings-view";
import type { InteractionHandler } from "@sapphire/framework";
import type { SettingsInteractionHandlerTypes } from "@utils/types";
import type { MessageComponentInteraction, CacheType } from "discord.js";
import type { SettingsInteractionHandler } from "../../../interactions/settings/settings-interaction-handler";
import { GuildTextChannelMessageComponentHandler } from "../guild-text-channel-message-component-handler";

export abstract class SettingsMessageComponentHandler<
  T extends SettingsInteractionHandlerTypes
> extends GuildTextChannelMessageComponentHandler {
  public abstract getReply(
    // eslint-disable-next-line no-unused-vars
    new_settings: T,
    // eslint-disable-next-line no-unused-vars
    data: InteractionHandler.ParseResult<this>
  ): Promise<SettingsMenuView<T>>;

  public abstract getInteractionHandler(
    // eslint-disable-next-line no-unused-vars
    interaction: MessageComponentInteraction<CacheType>,
    // eslint-disable-next-line no-unused-vars
    parsedData: InteractionHandler.ParseResult<this>
  ): Promise<SettingsInteractionHandler<T>>;

  public override async run(
    interaction: MessageComponentInteraction<CacheType>,
    parsedData: InteractionHandler.ParseResult<this>
  ) {
    try {
      const interaction_handler = await this.getInteractionHandler(interaction, parsedData);
      const data = await interaction_handler.execute();
      const reply = await this.getReply(data, parsedData);
      const view = await reply.getView();
      await interaction.update(view);
    } catch (error) {
      console.log(error);
      await interaction.reply({
        content: `An unknown error occured, we're looking into it!`,
      });

      return;
    }
  }
}
