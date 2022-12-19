import { elastic, Message } from "../index";

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
    const indexed_message = await elastic.indexMessage({
      id: "1",
      channel_id: "1",
      content: "hello",
      images: [],
      replies_to: "1",
      thread_id: "1",
      server_id: "1",
      solutions: [],
      author_id: "1",
      child_thread: "1",
    });
    expect(indexed_message).toBeDefined();
  });
  it("should search for a message", async () => {
    await elastic.createMessagesIndex();
    const msg: Message = {
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
    await elastic.indexMessage(msg);
    const fetched_message = await elastic.getMessage("1054158565633441823");
    expect(fetched_message).toBeDefined();
    expect(fetched_message!.id).toBe("1054158565633441823");
    expect(fetched_message).toEqual(msg);
  });
  it("should delete a message", async () => {
    await elastic.createMessagesIndex();
    const msg: Message = {
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
    await elastic.indexMessage(msg);
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
});
