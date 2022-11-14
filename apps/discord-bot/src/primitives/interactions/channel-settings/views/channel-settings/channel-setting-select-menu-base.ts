import {
  type PieceContext,
  type InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import type { SelectMenuBase } from "@primitives/message-components/select-menu/select-menu-base";
import { ChannelSettingsInteractionViewBase } from "./channel-setting-interaction-base";

export abstract class ChannelSettingSelectMenuBase extends ChannelSettingsInteractionViewBase {
  public abstract display: SelectMenuBase;
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }
}
