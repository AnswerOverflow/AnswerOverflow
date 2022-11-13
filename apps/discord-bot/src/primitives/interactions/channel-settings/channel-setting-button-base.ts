import {
  type PieceContext,
  type InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { ButtonBase } from "@primitives/message-components/buttons/button";
import { ChannelSettingInteractionBase } from "./channel-setting-interaction-base";

export abstract class ChannelSettingButtonBase extends ChannelSettingInteractionBase {
  public abstract display: ButtonBase;
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.Button,
    });
  }
}
