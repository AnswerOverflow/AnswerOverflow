import { elastic, Message } from "../index";

const msg1: Message = {
  id: "1054158565633441823",
  channel_id: "1",
  content: "hello",
  images: [],
  replies_to: "1",
  thread_id: "1",
  server_id: "843301848295014421",
  solutions: [],
  author_id: "523949187663134754",
  child_thread: "1",
};

const msg2: Message = {
  ...msg1,
  id: "200",
};

describe("ElasticSearch tests", () => {
  it("should return a 200 response", async () => {
    const ping = await elastic.ping();
    expect(ping).toBeTruthy();
  });
  it("should create a message index", async () => {
    const index = await elastic.createMessagesIndex();
    expect(index).toBeTruthy();
  });
  it("should index a message", async () => {
    await elastic.createMessagesIndex();
    const indexed_message = await elastic.upsertMessage(msg1);
    expect(indexed_message).toBeDefined();
  });
  it("should search for a message", async () => {
    await elastic.createMessagesIndex();
    await elastic.upsertMessage(msg1);
    const fetched_message = await elastic.getMessage("1054158565633441823");
    expect(fetched_message).toBeDefined();
    expect(fetched_message!.id).toBe("1054158565633441823");
    expect(fetched_message).toEqual(msg1);
  });
  it("should delete a message", async () => {
    await elastic.createMessagesIndex();

    await elastic.upsertMessage(msg1);
    const deleted_message = await elastic.deleteMessage("1054158565633441823");
    expect(deleted_message).toBeTruthy();
    const fetched_deleted_message = await elastic.getMessage("1054158565633441823");
    expect(fetched_deleted_message).toBeNull();
  });
  it("should delete a message that does not exist", async () => {
    await elastic.createMessagesIndex();
    const deleted_message = await elastic.deleteMessage("1054158565633441823");
    expect(deleted_message).toBeFalsy();
  });
  it("should bulk delete messages that exist", async () => {
    await elastic.createMessagesIndex();
    await elastic.upsertMessage(msg1);
    await elastic.upsertMessage(msg2);
    const deleted_messages = await elastic.bulkDeleteMessages([msg1.id, msg2.id]);
    expect(deleted_messages).toBeTruthy();
    const fetched_deleted_message1 = await elastic.getMessage(msg1.id);
    expect(fetched_deleted_message1).toBeNull();
    const fetched_deleted_message2 = await elastic.getMessage(msg2.id);
    expect(fetched_deleted_message2).toBeNull();
  });
  it("should bulk delete messages that do not exist", async () => {
    await elastic.createMessagesIndex();
    const deleted_messages = await elastic.bulkDeleteMessages([msg1.id, msg2.id]);
    expect(deleted_messages).toBeTruthy();
  });
  it("should bulk delete a message that does exist and one that does not", async () => {
    await elastic.createMessagesIndex();
    await elastic.upsertMessage(msg1);
    const deleted_messages = await elastic.bulkDeleteMessages([msg1.id, msg2.id]);
    expect(deleted_messages).toBeTruthy();
    const fetched_deleted_message1 = await elastic.getMessage(msg1.id);
    expect(fetched_deleted_message1).toBeNull();
    const fetched_deleted_message2 = await elastic.getMessage(msg2.id);
    expect(fetched_deleted_message2).toBeNull();
  });
});
