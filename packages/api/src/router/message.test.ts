import { clearDatabase, Message } from "@answeroverflow/db";
import { getGeneralScenario, ServerTestData } from "../test/utils";
import { messageRouter } from "./message";

let data: ServerTestData;
let messages_router: ReturnType<typeof messageRouter["createCaller"]>;
let message: Message;
let message2: Message;
beforeEach(async () => {
  const { data: server_data, manage_guild_ctx } = await getGeneralScenario();
  data = server_data;
  message = data.text_channels[0].messages[0];
  message2 = data.text_channels[0].messages[1];
  messages_router = messageRouter.createCaller(manage_guild_ctx);
  await clearDatabase();
});

describe("Message Upsert", () => {
  it("should create a message", async () => {
    const created = await messages_router.upsert(message);
    expect(created).toBeDefined();
  });
});

describe("Message Update", () => {
  it("should update a message", async () => {
    const created = await messages_router.upsert(message);
    expect(created).toBeDefined();
    const updated = await messages_router.update({
      ...created,
      content: "updated",
    });
    expect(updated!.content).toBe("updated");
  });
  it("should fail to update a message that doesn't exist", async () => {
    const updated = await messages_router.update({
      ...message,
      content: "updated",
    });
    expect(updated).toBeNull();
  });
});

describe("Message Delete", () => {
  it("should delete a message", async () => {
    const created = await messages_router.upsert(message);
    expect(created).toBeDefined();
    const deleted = await messages_router.delete(message!.id);
    expect(deleted).toBe(true);
  });
  it("should fail to delete a message that doesn't exist", async () => {
    const deleted = await messages_router.delete(message!.id);
    expect(deleted).toBe(false);
  });
});

describe("Message Bulk Delete", () => {
  it("should delete multiple messages", async () => {
    const created = await messages_router.upsert(message);
    const created2 = await messages_router.upsert(message2);
    expect(created).toBeDefined();
    expect(created2).toBeDefined();
    const deleted = await messages_router.deleteBulk([message!.id, message2!.id]);
    expect(deleted).toBe(true);
  });
});

describe("Message Get", () => {
  it("should get a message", async () => {
    const created = await messages_router.upsert(message);
    expect(created).toBeDefined();
    const fetched = await messages_router.byId(message!.id);
    expect(fetched).toBeDefined();
  });
  it("should fail to get a message that doesn't exist", async () => {
    const fetched = await messages_router.byId(message.id);
    expect(fetched).toBeNull();
  });
});
