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

  protected checkIfButtonIDMatches(interaction: ButtonInteraction) {
    if (isNullishOrEmpty(this.display)) return false;
    if (!interaction.customId.startsWith(this.display.id)) return false;
    return true;
  }

  // eslint-disable-next-line no-unused-vars
  public override async parse(interaction: ButtonInteraction) {
    if (!this.checkIfButtonIDMatches(interaction)) return this.none();
    return this.some({});
  }
}
