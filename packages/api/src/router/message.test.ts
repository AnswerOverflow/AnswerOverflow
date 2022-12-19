import { clearDatabase } from "@answeroverflow/db";
import { TEST_CHANNEL_1, TEST_SERVER_1 } from "~api/test/utils";
import { PermissionsBitField } from "discord.js";
import { botRouter } from ".";
import { createBotContext } from "../context";

// eslint-disable-next-line no-unused-vars
let router: ReturnType<typeof botRouter["createCaller"]>;

beforeEach(async () => {
  const manageGuildContext = await createBotContext({
    session: {
      expires: new Date().toUTCString(),
      user: {
        email: null,
        image: "https://example.com",
        name: "test",
        id: "1",
      },
    },
    user_servers: [
      {
        features: [],
        icon: null,
        id: TEST_SERVER_1.id,
        name: TEST_SERVER_1.name,
        owner: false,
        permissions: Number(PermissionsBitField.resolve("ManageGuild")),
      },
    ],
  });
  router = botRouter.createCaller(manageGuildContext);
  await clearDatabase();
});

describe("Message Router", () => {
  it("should create a message", async () => {
    const created_message = await router.messages.upsert({
      message: {
        id: "102",
        content: "test",
        child_thread: null,
        images: [],
        replies_to: null,
        solutions: [],
        thread_id: "1",
      },
      channel: {
        create: {
          ...TEST_CHANNEL_1,
        },
        update: {
          ...TEST_CHANNEL_1,
        },
      },
      author: {
        id: "123",
        name: "name",
      },
    });
    expect(created_message.id).toBe("102");
  });
  it("should delete a message", async () => {
    const created_message = await router.messages.upsert({
      message: {
        id: "102",
        content: "test",
        child_thread: null,
        images: [],
        replies_to: null,
        solutions: [],
        thread_id: "1",
      },
      channel: {
        create: {
          ...TEST_CHANNEL_1,
        },
        update: {
          ...TEST_CHANNEL_1,
        },
      },
      author: {
        id: "123",
        name: "name",
      },
    });
    const fetched_message = await router.messages.byId(created_message.id);
    expect(fetched_message).toBeDefined();
    expect(fetched_message!.id).toBe("102");
    const delete_status = await router.messages.delete(created_message.id);
    expect(delete_status).toBeTruthy();
    const deleted_message = await router.messages.byId(created_message.id);
    expect(deleted_message).toBeNull();
  });
});
