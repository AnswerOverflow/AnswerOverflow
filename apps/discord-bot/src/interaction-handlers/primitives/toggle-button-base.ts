import { InteractionHandler, InteractionHandlerTypes, PieceContext } from "@sapphire/framework";
import { isNullishOrEmpty } from "@sapphire/utilities";
import type { ButtonInteraction, MessageButton } from "discord.js";
import type { ButtonCreator } from "lib/utils";
import type { ButtonBase } from "./button-base";

const TOGGLE_BUTTON_PREFIX = "_toggle";

export abstract class ToggleButtonBase implements ButtonCreator {
  public abstract display: ButtonBase;

  makeButton(): MessageButton {
    return this.display.makeButton().setCustomId(this.id);
  }
  get id() {
    return this.display.id + TOGGLE_BUTTON_PREFIX;
  }
}

// The class that is used to build a button that can be toggled on and off
export abstract class ToggleButtonCombo implements ButtonCreator {
  public abstract enable_button: ToggleButtonBase;
  public abstract disable_button: ToggleButtonBase;
  // eslint-disable-next-line no-unused-vars
  constructor(public readonly already_enabled: boolean) {}
  makeButton(): MessageButton {
    if (this.already_enabled) {
      return this.disable_button.makeButton();
    } else {
      return this.enable_button.makeButton();
    }
  }
}

export abstract class ToggleButtonBaseHandler extends InteractionHandler {
  public abstract buttons: ToggleButtonCombo;
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }

  public override parse(interaction: ButtonInteraction) {
    if (isNullishOrEmpty(this.buttons)) return this.none();
    const is_enable_button = interaction.customId == this.buttons.enable_button.id;
    const is_disable_button = interaction.customId == this.buttons.disable_button.id;
    if (!is_enable_button && !is_disable_button) return this.none();
    return this.some({
      enable: interaction.customId == this.buttons.enable_button.id,
    });
  }

  public abstract run(
    // eslint-disable-next-line no-unused-vars
    interaction: ButtonInteraction,
    // eslint-disable-next-line no-unused-vars
    parsedData: InteractionHandler.ParseResult<this>
  ): Promise<void>;
}
