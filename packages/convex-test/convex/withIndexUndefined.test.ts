import { expect, test } from "vitest";
import { convexTest } from "../index";
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

test("withIndex undefined field matching", async () => {
  const schema = defineSchema({
    things: defineTable({
      field: v.optional(v.string()),
      otherField: v.optional(v.string()),
    }).index("field", ["field"]),
  });
  const t = convexTest(schema);

  const things = await t.run(async (ctx) => {
    await ctx.db.insert("things", {});
    await ctx.db.insert("things", { field: "some" });
    await ctx.db.insert("things", { field: "other" });
    await ctx.db.insert("things", { otherField: "value" });

    return await ctx.db
      .query("things")
      .withIndex("field", (q) => q.eq("field", undefined))
      .collect();
  });

  expect(things).toMatchObject([{}, { otherField: "value" }]);
});

test("withIndex undefined vs null distinction", async () => {
  const schema = defineSchema({
    things: defineTable({
      field: v.optional(v.union(v.string(), v.null())),
    }).index("field", ["field"]),
  });
  const t = convexTest(schema);

  await t.run(async (ctx) => {
    await ctx.db.insert("things", { field: null });
    await ctx.db.insert("things", { field: "value" });
    await ctx.db.insert("things", {});
  });

  const undefinedResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("things")
      .withIndex("field", (q) => q.eq("field", undefined))
      .collect();
  });

  const nullResults = await t.run(async (ctx) => {
    return await ctx.db
      .query("things")
      .withIndex("field", (q) => q.eq("field", null))
      .collect();
  });

  expect(undefinedResults).toMatchObject([{}]);
  expect(nullResults).toMatchObject([{ field: null }]);
});
