import type { MessageActionRow } from "discord.js";

export type MessageView = { content: string; components: MessageActionRow[] };

export interface ViewConstructor {
  getView(): Promise<MessageView>;
  getActionRows(): Promise<MessageActionRow[]>;
  getContent(): Promise<string>;
}

export abstract class ViewBase implements ViewConstructor {
  public abstract getContent(): Promise<string>;
  public abstract getActionRows(): Promise<MessageActionRow[]>;
  public async getView(): Promise<MessageView> {
    const response: MessageView = {
      content: await this.getContent(),
      components: await this.getActionRows(),
    };
    return response;
  }
}
