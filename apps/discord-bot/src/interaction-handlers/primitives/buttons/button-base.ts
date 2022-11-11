import { InteractionHandler, InteractionHandlerTypes, PieceContext } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import { ButtonInteraction, MessageButton, MessageButtonStyleResolvable } from "discord.js";
export interface ButtonCreator {
  makeButton(): MessageButton;
}

export abstract class ButtonBase implements ButtonCreator {
  public abstract id: string;
  public abstract label: string;
  public abstract style: MessageButtonStyleResolvable;
  public makeButton() {
    return new MessageButton().setCustomId(this.id).setLabel(this.label).setStyle(this.style);
  }
}

export abstract class ButtonBaseHandler extends InteractionHandler {
  public abstract display: ButtonBase;
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }
  public override parse(interaction: ButtonInteraction) {
    if (isNullishOrEmpty(this.display)) return this.none();
    if (!interaction.customId.startsWith(this.display.id)) return this.none();
    return this.some({});
  }
}
