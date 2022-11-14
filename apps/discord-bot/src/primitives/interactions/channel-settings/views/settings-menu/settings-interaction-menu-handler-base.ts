import { GuildTextChannelButtonHandler } from "@primitives/interactions/guild-text-interaction-base";
import type { InteractionHandler } from "@sapphire/framework";
import type { SettingsInteractionHandlerTypes } from "@utils/types";
import type { MessageComponentInteraction, CacheType } from "discord.js";
import type { SettingsMenuView } from "@primitives/views/settings-view";
import type { SettingsInteractionHandler } from "./settings-interaction-handler";

export abstract class SettingsInteractionMenuBaseHandler<
  T extends SettingsInteractionHandlerTypes
> extends GuildTextChannelButtonHandler {
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
      const data = await interaction_handler.updateSettings(interaction);
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
