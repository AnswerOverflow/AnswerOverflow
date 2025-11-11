import { expect, test } from "vitest";
import { convexTest } from "../index";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

test("withSearchIndex .eq with undefined values", async () => {
  const schema = defineSchema({
    messages: defineTable({
      body: v.string(),
      author: v.optional(v.string()),
      deletionTime: v.optional(v.number()),
    }).searchIndex("body", {
      searchField: "body",
      filterFields: ["author", "deletionTime"],
    }),
  });
  const t = convexTest(schema);

  await t.run(async (ctx) => {
    await ctx.db.insert("messages", {
      body: "Hello world",
      author: "alice",
    });
    await ctx.db.insert("messages", {
      body: "Goodbye world",
      author: "bob",
      deletionTime: 123456,
    });
    await ctx.db.insert("messages", {
      body: "Test message",
    });
  });

  const undefinedResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("messages")
      .withSearchIndex("body", (q) =>
        q.search("body", "world").eq("deletionTime", undefined),
      )
      .collect();
  });

  expect(undefinedResults).toMatchObject([
    { body: "Hello world", author: "alice" },
  ]);

  const definedResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("messages")
      .withSearchIndex("body", (q) =>
        q.search("body", "world").eq("deletionTime", 123456),
      )
      .collect();
  });

  expect(definedResults).toMatchObject([
    { body: "Goodbye world", author: "bob", deletionTime: 123456 },
  ]);

  const undefinedAuthorResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("messages")
      .withSearchIndex("body", (q) =>
        q.search("body", "message").eq("author", undefined),
      )
      .collect();
  });

  expect(undefinedAuthorResults).toMatchObject([{ body: "Test message" }]);

  const definedAuthorResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("messages")
      .withSearchIndex("body", (q) =>
        q.search("body", "world").eq("author", "alice"),
      )
      .collect();
  });

  expect(definedAuthorResults).toMatchObject([
    { body: "Hello world", author: "alice" },
  ]);
});

test("withSearchIndex .eq undefined vs null distinction", async () => {
  const schema = defineSchema({
    items: defineTable({
      name: v.string(),
      status: v.optional(v.union(v.string(), v.null())),
    }).searchIndex("name", {
      searchField: "name",
      filterFields: ["status"],
    }),
  });
  const t = convexTest(schema);

  await t.run(async (ctx) => {
    await ctx.db.insert("items", { name: "item1" });
    await ctx.db.insert("items", { name: "item2", status: null });
    await ctx.db.insert("items", { name: "item3", status: "active" });
  });

  const undefinedResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("items")
      .withSearchIndex("name", (q) =>
        q.search("name", "item").eq("status", undefined),
      )
      .collect();
  });

  expect(undefinedResults).toMatchObject([{ name: "item1" }]);

  const nullResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("items")
      .withSearchIndex("name", (q) =>
        q.search("name", "item").eq("status", null),
      )
      .collect();
  });

  expect(nullResults).toMatchObject([{ name: "item2", status: null }]);

  const definedResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("items")
      .withSearchIndex("name", (q) =>
        q.search("name", "item").eq("status", "active"),
      )
      .collect();
  });

  expect(definedResults).toMatchObject([{ name: "item3", status: "active" }]);
});
