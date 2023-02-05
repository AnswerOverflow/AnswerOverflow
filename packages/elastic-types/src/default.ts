import type { Message } from "./elastic";

export function getDefaultMessage(
  override: Partial<Message> & {
    id: string;
    channel_id: string;
    server_id: string;
    author_id: string;
  }
): Message {
  const data: Message = {
    content: "",
    images: [],
    replies_to: null,
    child_thread: null,
    solutions: [],
    ...override,
  };
  return data;
}
