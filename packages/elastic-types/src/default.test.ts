import { getRandomId } from "@answeroverflow/utils";
import { getDefaultMessage } from "./default";

describe("Default Message Values", () => {
  it("should verify message default values are correct", () => {
    const server_id = getRandomId();
    const channel_id = getRandomId();
    const author_id = getRandomId();
    const message_id = getRandomId();
    const msg = getDefaultMessage({
      id: message_id,
      channel_id,
      server_id,
      author_id,
    });
    expect(msg).toEqual({
      id: message_id,
      channel_id,
      server_id,
      author_id,
      content: "",
      images: [],
      replies_to: null,
      child_thread: null,
      solutions: [],
    });
  });
});
