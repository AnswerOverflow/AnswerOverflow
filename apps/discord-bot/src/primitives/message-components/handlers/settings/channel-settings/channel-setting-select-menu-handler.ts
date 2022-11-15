import type { SelectMenuBase } from "@primitives/message-components/select-menu/select-menu-base";
import {
  type PieceContext,
  type InteractionHandler,
  InteractionHandlerTypes,
} from "@sapphire/framework";
import { ChannelSettingsMessageComponentHandler } from "./channel-setting-message-component-handler";

export abstract class ChannelSettingSelectMenuHandler extends ChannelSettingsMessageComponentHandler {
  public abstract display: SelectMenuBase;
  public constructor(ctx: PieceContext, options: InteractionHandler.Options) {
    super(ctx, {
      ...options,
      interactionHandlerType: InteractionHandlerTypes.SelectMenu,
    });
  }
}
