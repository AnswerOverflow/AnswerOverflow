import type { MessageActionRow } from "discord.js";

export type MessageView = { content: string; components: MessageActionRow[] };

export interface ViewConstructor {
  getView(): Promise<MessageView>;
}

export abstract class ViewBase implements ViewConstructor {
  public abstract getView(): Promise<MessageView>;
}
