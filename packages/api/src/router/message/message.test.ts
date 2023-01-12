import { clearDatabase, Message } from "@answeroverflow/db";
import { TRPCError } from "@trpc/server";
import { getGeneralScenario, ServerTestData } from "~api/test/utils";
import { ignored_discord_account_router } from "../users/ignored-discord-accounts/ignored-discord-account";
import { messageRouter } from "./message";

let data: ServerTestData;
let messages_router: ReturnType<typeof messageRouter["createCaller"]>;
let account1_ignored_account_router: ReturnType<
  typeof ignored_discord_account_router["createCaller"]
>;
let account1_message: Message;
let account2_message: Message;
beforeEach(async () => {
  const { data1 } = await getGeneralScenario();
  data = data1;
  account1_message = data.text_channels[0].messages.account1_messages[0];
  account2_message = data.text_channels[0].messages.account2_messages[0];
  account1_ignored_account_router = ignored_discord_account_router.createCaller(
    data.account1_guild_manager_ctx
  );
  messages_router = messageRouter.createCaller(data1.bot_caller_ctx);
  await clearDatabase();
});

describe("Message Operations", () => {
  describe("Message Upsert", () => {
    it("should create a message", async () => {
      const created = await messages_router.upsert(account1_message);
      expect(created).toBeDefined();
    });
    it("should only create messages of non ignored users", async () => {
      await account1_ignored_account_router.upsert(data.account1_guild_manager.id);
      await expect(messages_router.upsert(account1_message)).rejects.toThrow(TRPCError);
    });
  });

  describe("Message Upsert Bulk", () => {
    it("should create multiple messages", async () => {
      const created = await messages_router.upsertBulk([account1_message, account2_message]);
      expect(created.length).toBe(2);
    });
    it("should only create messages of non ignored users in bulk upsert", async () => {
      await account1_ignored_account_router.upsert(data.account1_guild_manager.id);
      const created = await messages_router.upsertBulk([account1_message, account2_message]);
      expect(created.length).toBe(1);
      await expect(messages_router.byId(account1_message.id)).rejects.toThrow(TRPCError);
    });
  });

  describe("Message Update", () => {
    it("should update a message", async () => {
      const created = await messages_router.upsert(account1_message);
      expect(created).toBeDefined();
      const updated = await messages_router.update({
        ...created,
        content: "updated",
      });
      expect(updated!.content).toBe("updated");
    });
    it("should fail to update a message that doesn't exist", async () => {
      const updated = await messages_router.update({
        ...account1_message,
        content: "updated",
      });
      expect(updated).toBeNull();
    });
  });

  describe("Message Delete", () => {
    it("should delete a message", async () => {
      const created = await messages_router.upsert(account1_message);
      expect(created).toBeDefined();
      const deleted = await messages_router.delete(account1_message!.id);
      expect(deleted).toBe(true);
    });
    it("should fail to delete a message that doesn't exist", async () => {
      await expect(messages_router.delete("awd")).rejects.toThrow(TRPCError);
    });
  });

  describe("Message Bulk Delete", () => {
    it("should delete multiple messages", async () => {
      const created = await messages_router.upsert(account1_message);
      const created2 = await messages_router.upsert(account2_message);
      expect(created).toBeDefined();
      expect(created2).toBeDefined();
      const deleted = await messages_router.deleteBulk([
        account1_message!.id,
        account2_message!.id,
      ]);
      expect(deleted).toBe(true);
    });
  });

  describe("Message Get", () => {
    it("should get a message", async () => {
      const created = await messages_router.upsert(account1_message);
      expect(created).toBeDefined();
      const fetched = await messages_router.byId(account1_message!.id);
      expect(fetched).toBeDefined();
    });
    it("should fail to get a message that doesn't exist", async () => {
      await expect(messages_router.byId(account1_message.id)).rejects.toThrow(TRPCError);
    });
  });
});
