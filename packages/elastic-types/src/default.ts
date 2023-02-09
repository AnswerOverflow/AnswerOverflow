import type { Message } from "./elastic";

export function getDefaultMessage(
  override: Partial<Message> & {
    id: string;
    channelId: string;
    serverId: string;
    authorId: string;
  }
): Message {
  const data: Message = {
    content: "",
    images: [],
    repliesTo: null,
    childThread: null,
    solutions: [],
    ...override,
  };
  return data;
}
