import { MessageWithDiscordAccount } from "@answeroverflow/core/message";

export type MessageProps = {
  message: MessageWithDiscordAccount;
  showBorders?: boolean;
  numberOfMessages?: number;
  className?: string;
  fullRounded?: boolean;
  /**
   * If typed as true, will collapse the content if longer than default
   * If typed as a number, will collapse the content if longer than the number
   */
  collapseContent?: boolean | number;
  loadingStyle?: "lazy" | "eager";
};
