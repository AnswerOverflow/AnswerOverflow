import {
  type PieceContext,
  type InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { ChannelSettingsMessageComponentHandler } from "./channel-setting-message-component-handler";

export abstract class ChannelSettingButtonHandler extends ChannelSettingsMessageComponentHandler {
  public abstract display: ButtonBase;
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }
}
