import { getRandomId } from "@answeroverflow/utils";
import { getDefaultMessage } from "./default";

describe("Default Message Values", () => {
  it("should verify message default values are correct", () => {
    const serverId = getRandomId();
    const channelId = getRandomId();
    const authorId = getRandomId();
    const messageId = getRandomId();
    const msg = getDefaultMessage({
      id: messageId,
      channelId,
      serverId,
      authorId,
    });
    expect(msg).toEqual({
      id: messageId,
      channelId,
      serverId,
      authorId,
      content: "",
      images: [],
      repliesTo: null,
      childThread: null,
      solutions: [],
    });
  });
});
