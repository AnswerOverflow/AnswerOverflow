import { elastic } from "../index";

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
      author_id: "1",
      type: 1,
      mentions: ["1"],
      mention_everyone: false,
      content: "hello",
      has: 0,
      author_type: 1,
      guild_id: "1",
      attachment_extensions: [],
      attachment_filenames: [],
      link_hostnames: [],
      embed_providers: [],
      embed_types: [],
    });
    expect(indexed_message.result).toBe("created");
  });
  it("should search for a message", async () => {
    await elastic.createMessagesIndex();
    await elastic.indexMessage({
      id: "1",
      channel_id: "1",
      author_id: "1",
      type: 1,
      mentions: ["1"],
      mention_everyone: false,
      content: "hello",
      has: 0,
      author_type: 1,
      guild_id: "1",
      attachment_extensions: [],
      attachment_filenames: [],
      link_hostnames: [],
      embed_providers: [],
      embed_types: [],
    });
    const fetched_message = elastic.getMessage("1");
    expect(fetched_message).toBeTruthy();
  });
});
