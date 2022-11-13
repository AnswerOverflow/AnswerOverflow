import { ApplyOptions } from "@sapphire/decorators";
import { InteractionHandler, InteractionHandlerTypes } from "@sapphire/framework";
import { MessageSelectMenu, MessageSelectOptionData } from "discord.js";
import type { InteractionDisplay } from "@primitives/interactions/interaction-base";

export interface SelectMenuCreator {
  makeSelectMenu(): MessageSelectMenu;
}

export abstract class SelectMenuBase implements SelectMenuCreator, InteractionDisplay {
  public getId(): string {
    return this.id;
  }
  public abstract id: string;
  public abstract label: string;
  public abstract options: MessageSelectOptionData[];
  public placeholder?: string;
  public makeSelectMenu() {
    const select_menu = new MessageSelectMenu().setCustomId(this.id).addOptions(this.options);
    if (this.placeholder) {
      select_menu.setPlaceholder(this.placeholder);
    }
    return select_menu;
  }
}

@ApplyOptions<InteractionHandler.Options>({
  interactionHandlerType: InteractionHandlerTypes.SelectMenu,
})
export abstract class SelectMenuHandler extends InteractionHandler {}
