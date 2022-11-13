import {
  type PieceContext,
  type InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { SelectMenuBase } from "@primitives/message-components/select-menu/select-menu-base";
import { ChannelSettingInteractionBase } from "./channel-setting-interaction-base";

export abstract class ChannelSettingSelectMenuBase extends ChannelSettingInteractionBase {
  public abstract display: SelectMenuBase;
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }
}
