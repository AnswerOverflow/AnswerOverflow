import { expect, it, test, vi, describe, beforeEach, afterEach } from "vitest";
import { TestConvex, convexTest } from "../index";
import { api } from "./_generated/api";
import schema from "./schema";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

test("collect", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello1" });
    await ctx.db.insert("messages", { author: "sarah", body: "hello2" });
  });
  const messages = await t.query(api.queries.list);
  expect(messages).toMatchObject([
    { author: "sarah", body: "hello1" },
    { author: "sarah", body: "hello2" },
  ]);
});

test("count", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello1" });
    await ctx.db.insert("messages", { author: "sarah", body: "hello2" });
  });
  const count = await t.query(api.queries.count);
  expect(count).toStrictEqual(2);
});

test("withIndex", async () => {
  const t = convexTest(schema);
  const messages = await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello1" });
    await ctx.db.insert("messages", { author: "michal", body: "hello2" });
    await ctx.db.insert("messages", { author: "sarah", body: "hello2" });
    return await ctx.db
      .query("messages")
      .withIndex("author", (q) => q.eq("author", "sarah"))
      .collect();
  });
  expect(messages).toMatchObject([
    { author: "sarah", body: "hello1" },
    { author: "sarah", body: "hello2" },
  ]);
});

test("withIndex with undefined", async () => {
  const schema = defineSchema({
    things: defineTable({
      field: v.optional(v.string()),
    }).index("field", ["field"]),
  });
  const t = convexTest(schema);
  const things = await t.run(async (ctx) => {
    await ctx.db.insert("things", {});
    await ctx.db.insert("things", { field: "some" });
    return await ctx.db
      .query("things")
      .withIndex("field", (q) => q.eq("field", undefined))
      .collect();
  });
  expect(things).toMatchObject([{}]);
});

describe("system index", () => {
  let t: TestConvex<typeof schema>;
  beforeEach(() => {
    vi.useFakeTimers();
    t = convexTest(schema);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("works with by_creation_time", async () => {
    vi.setSystemTime(new Date("2024-05-31T00:00:00.000Z"));
    await t.run(async (ctx) => {
      await ctx.db.insert("messages", { author: "A", body: "A" });
      await ctx.db.insert("messages", { author: "B", body: "B" });
    });
    vi.setSystemTime(new Date("2024-06-02T00:00:00.000Z"));
    await t.run(async (ctx) => {
      await ctx.db.insert("messages", { author: "C", body: "C" });
    });

    const things = await t.run(async (ctx) => {
      return await ctx.db
        .query("messages")
        .withIndex("by_creation_time", (q) =>
          q.lte(
            "_creationTime",
            new Date("2024-06-01T00:00:00.000Z").getTime(),
          ),
        )
        .collect();
    });
    expect(things.length).toStrictEqual(2);
    expect(things.map((t) => t.author)).toEqual(["A", "B"]);
  });

  it("works with by_id", async () => {
    const things = await t.run(async (ctx) => {
      await ctx.db.insert("messages", { author: "A", body: "A" });
      await ctx.db.insert("messages", { author: "B", body: "B" });
      return await ctx.db.query("messages").withIndex("by_id").collect();
    });
    expect(things.length).toStrictEqual(2);
  });
});

test("type ordering", async () => {
  const relaxedSchema = defineSchema({
    messages: defineTable({
      author: v.optional(v.any()),
      body: v.string(),
    }).index("author", ["author"]),
  });
  const t = convexTest(relaxedSchema);
  const authors = await t.run(async (ctx) => {
    const authors: any[] = [
      "stringValue",
      "xFactor",
      undefined,
      false,
      true,
      34,
      35,
      BigInt(34),
      null,
      ["a"],
      { a: 1 },
      new ArrayBuffer(8),
    ];
    await Promise.all(
      authors.map(async (author) => {
        await ctx.db.insert("messages", { author, body: "hello" });
      }),
    );
    return (
      await ctx.db.query("messages").withIndex("author").order("desc").collect()
    ).map(({ author }) => (author === undefined ? "UNDEFINED" : author));
  });
  expect(authors).toMatchObject([
    { a: 1 },
    ["a"],
    new ArrayBuffer(8),
    "xFactor",
    "stringValue",
    true,
    false,
    35,
    34,
    BigInt(34),
    null,
    "UNDEFINED",
  ]);
});

test("order", async () => {
  const t = convexTest(schema);
  // Test both in and out of transaction ordering
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello1" });
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello2" });
  });
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello3" });
    await ctx.db.insert("messages", { author: "sarah", body: "hello4" });
  });
  const messages = await t.query(api.queries.lastN, { count: 3 });
  expect(messages).toMatchObject([
    { author: "sarah", body: "hello2" },
    { author: "sarah", body: "hello3" },
    { author: "sarah", body: "hello4" },
  ]);
});

test("index order", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello3" });
    await ctx.db.insert("messages", { author: "sarah", body: "hello4" });
    const messages = await ctx.db
      .query("messages")
      .withIndex("author", (q) => q.eq("author", "sarah"))
      .order("desc")
      .collect();
    expect(messages).toMatchObject([{ body: "hello4" }, { body: "hello3" }]);
  });
});

test("normalizeId", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    const messageId = await ctx.db.insert("messages", {
      author: "sarah",
      body: "hello",
    });
    expect(ctx.db.normalizeId("messages", messageId)).toEqual(messageId);
    expect(ctx.db.normalizeId("messages", "Not an ID")).toEqual(null);
  });
});

test("default export", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "sarah", body: "hello1" });
    await ctx.db.insert("messages", { author: "sarah", body: "hello2" });
  });
  const messages = await t.query(api.queries.default);
  expect(messages).toMatchObject([
    { author: "sarah", body: "hello1" },
    { author: "sarah", body: "hello2" },
  ]);
});
