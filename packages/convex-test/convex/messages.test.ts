import { expect, test, vi } from "vitest";
import { convexTest } from "../index";
import { api } from "./_generated/api";
import schema from "./schema";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

test("messages", async () => {
  const t = convexTest(schema);
  await t.mutation(api.messages.send, { body: "hello", author: "sarah" });
  await t.mutation(api.messages.send, { body: "hello", author: "tom" });
  const asSarah = t.withIdentity({ name: "sarah" });
  const bySarah = await asSarah.query(api.messages.listByAuth);
  expect(bySarah.length).toEqual(1);
  const all = await t.run((ctx) => {
    return ctx.db.query("messages").collect();
  });
  expect(all.length).toEqual(2);
});

test("ai", async () => {
  const t = convexTest(schema);
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ text: async () => "I am the overlord" }) as Response),
  );
  await t.action(api.messages.sendAIMessage, { prompt: "hello" });
  const messages = await t.query(api.messages.list);
  expect(messages).toMatchObject([{ author: "AI", body: "I am the overlord" }]);
  vi.unstubAllGlobals();
});

test("all types serde", async () => {
  const relaxedSchema = defineSchema({
    messages: defineTable({
      body: v.optional(v.any()),
    }).index("body", ["body"]),
  });
  const t = convexTest(relaxedSchema);
  const expectBodiesEq = (a: any, b: any) => {
    if (a === undefined) {
      expect(b).toBeUndefined();
    } else {
      expect(b).toMatchObject(a);
    }
  };
  await t.run(async (ctx) => {
    async function testBody(body: any) {
      const id = await ctx.db.insert("messages", { body });
      // Simple db.get
      const byGet = await ctx.db.get(id);
      expect(byGet).not.toBeNull();
      expectBodiesEq(byGet!.body, body);
      // Indexed db.query
      const byIndex = await ctx.db
        .query("messages")
        .withIndex("body", (q) => q.eq("body", body))
        .unique();
      expect(byIndex).not.toBeNull();
      expectBodiesEq(byIndex!.body, body);
      // Filtered db.query
      const byFilter = await ctx.db
        .query("messages")
        .filter((q) => q.eq(q.field("body"), body))
        .unique();
      expect(byFilter).not.toBeNull();
      expectBodiesEq(byFilter!.body, body);
      // Patch
      await ctx.db.patch(id, { body });
      expectBodiesEq((await ctx.db.get(id))!.body, body);
      // Replace
      await ctx.db.replace(id, { body });
      expectBodiesEq((await ctx.db.get(id))!.body, body);
      // Delete
      await ctx.db.delete(id);
      const byGetAfterDelete = await ctx.db.get(id);
      expect(byGetAfterDelete).toBeNull();
    }
    // NOTE: do it this way instead of with an array so the failed test case
    // shows up in the stacktrace.
    await testBody("stringValue");
    await testBody(undefined);
    await testBody(true);
    await testBody(35);
    await testBody(BigInt(34));
    await testBody(null);
    await testBody(["a"]);
    await testBody([BigInt(34)]);
    await testBody({ a: 1 });
    await testBody({ a: BigInt(34) });
    await testBody(new ArrayBuffer(8));
    await testBody(Number.POSITIVE_INFINITY);
    await testBody(Number.NEGATIVE_INFINITY);
    await testBody(-0.0);
    await testBody(NaN);
  });
});
