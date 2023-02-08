import { getRandomId } from "@answeroverflow/utils";
import { elastic, Message } from "../index";

let msg1: Message;

let msg2: Message;

beforeEach(() => {
  msg1 = {
    id: getRandomId(),
    channelId: getRandomId(),
    content: "hello",
    images: [],
    repliesTo: "1",
    serverId: getRandomId(),
    solutions: [],
    authorId: getRandomId(),
    childThread: getRandomId(),
  };
  msg2 = {
    ...msg1,
    id: getRandomId(),
  };
});

describe("ElasticSearch", () => {
  describe("Message Create", () => {
    it("should index a message", async () => {
      const indexedMessage = await elastic.upsertMessage(msg1);
      expect(indexedMessage).toBeDefined();
    });
  });
  describe("Message Create Bulk", () => {
    it("should bulk index messages", async () => {
      const bulkSuccess = await elastic.bulkUpsertMessages([msg1, msg2]);
      expect(bulkSuccess).toBeTruthy();
      const fetchedMsg1 = await elastic.getMessage(msg1.id);
      expect(fetchedMsg1).toStrictEqual(msg1);
    });
  });
  describe("Message Delete", () => {
    it("should delete a message", async () => {
      await elastic.upsertMessage(msg1);
      const deletedMessage = await elastic.deleteMessage(msg1.id);
      expect(deletedMessage).toBeTruthy();
      const fetchedDeletedMessage = await elastic.getMessage(msg1.id);
      expect(fetchedDeletedMessage).toBeNull();
    });
    it("should delete a message that does not exist", async () => {
      const deletedMessage = await elastic.deleteMessage(msg1.id);
      expect(deletedMessage).toBeFalsy();
    });
  });
  describe("Message Delete Bulk", () => {
    it("should bulk delete messages that exist", async () => {
      await elastic.upsertMessage(msg1);
      await elastic.upsertMessage(msg2);
      const deletedMessages = await elastic.bulkDeleteMessages([msg1.id, msg2.id]);
      expect(deletedMessages).toBeTruthy();
      const fetchedDeletedMessage1 = await elastic.getMessage(msg1.id);
      expect(fetchedDeletedMessage1).toBeNull();
      const fetchedDeletedMessage2 = await elastic.getMessage(msg2.id);
      expect(fetchedDeletedMessage2).toBeNull();
    });
    it("should bulk delete messages that do not exist", async () => {
      const deletedMessages = await elastic.bulkDeleteMessages([msg1.id, msg2.id]);
      expect(deletedMessages).toBeTruthy();
    });
    it("should bulk delete a message that does exist and one that does not", async () => {
      await elastic.upsertMessage(msg1);
      const deletedMessages = await elastic.bulkDeleteMessages([msg1.id, msg2.id]);
      expect(deletedMessages).toBeTruthy();
      const fetchedDeletedMessage1 = await elastic.getMessage(msg1.id);
      expect(fetchedDeletedMessage1).toBeNull();
      const fetchedDeletedMessage2 = await elastic.getMessage(msg2.id);
      expect(fetchedDeletedMessage2).toBeNull();
    });
  });
  describe("Message Delete By Channel Id", () => {
    it("should delete a message by thread id", async () => {
      const threadMessage = {
        ...msg1,
        channelId: getRandomId(),
      };
      await elastic.upsertMessage(threadMessage);
      const deletedMessage = await elastic.deleteByChannelId(threadMessage.channelId);
      expect(deletedMessage).toBe(1);
      // wait 1 second
      const fetchedDeletedMessage = await elastic.getMessage(threadMessage.id);
      expect(fetchedDeletedMessage).toBeNull();
    });
  });
  describe("Message Fetch", () => {
    it("should search for a message", async () => {
      await elastic.upsertMessage(msg1);
      const fetchedMessage = await elastic.getMessage(msg1.id);
      expect(fetchedMessage).toBeDefined();
      expect(fetchedMessage!.id).toBe(msg1.id);
      expect(fetchedMessage).toEqual(msg1);
    });
  });

  describe("Message Fetch Bulk", () => {
    it("should bulk fetch messages", async () => {
      await elastic.upsertMessage(msg1);
      await elastic.upsertMessage(msg2);
      const fetchedMessages = await elastic.bulkGetMessages([msg1.id, msg2.id]);
      expect(fetchedMessages).toBeDefined();
      expect(fetchedMessages).toHaveLength(2);
      expect(fetchedMessages).toEqual([msg1, msg2]);
    });
    it("should return an empty array if no messages are found", async () => {
      const fetchedMessages = await elastic.bulkGetMessages([msg1.id, msg2.id]);
      expect(fetchedMessages).toBeDefined();
      expect(fetchedMessages).toHaveLength(0);
    });
  });

  describe("Messages Fetch By Channel Id", () => {
    it("should fetch messages by channel id", async () => {
      await elastic.upsertMessage(msg1);
      await elastic.upsertMessage(msg2);

      const fetchedMessages = await elastic.bulkGetMessagesByChannelId(msg1.channelId);
      expect(fetchedMessages).toBeDefined();
      expect(fetchedMessages).toHaveLength(2);
    });
  });
});
