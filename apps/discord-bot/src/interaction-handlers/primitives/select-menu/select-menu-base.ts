import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { MessageSelectMenu, MessageSelectOptionData } from "discord.js";

export interface SelectMenuCreator {
  makeSelectMenu(): MessageSelectMenu;
}

export abstract class SelectMenuBase implements SelectMenuCreator {
  public abstract id: string;
  public abstract label: string;
  public abstract options: MessageSelectOptionData[];
  public makeSelectMenu() {
    return new MessageSelectMenu().setCustomId(this.id).addOptions(this.options);
  }
}

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export abstract class SelectMenuHandler extends InteractionHandler {}
