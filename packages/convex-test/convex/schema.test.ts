import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { expect, test } from "vitest";
import { convexTest } from "../index";

test("table names must be identifiers", async () => {
  {
    const schema = defineSchema({
      "a-b": defineTable({}),
    });
    expect(() => convexTest(schema)).toThrow();
  }
  {
    const schema = defineSchema({
      _a: defineTable({}),
    });
    expect(() => convexTest(schema)).toThrow();
  }
});

test("field names must be identifiers", async () => {
  const schema = defineSchema({
    a: defineTable({ _a: v.string() }),
  });
  expect(() => convexTest(schema)).toThrow();
});

test("accepts _id and _creationTime", async () => {
  const schema = defineSchema({
    a: defineTable({ _id: v.string(), _creationTime: v.number() }),
  });
  expect(() => convexTest(schema)).not.toThrow();
});

test("field names must be identifiers union", async () => {
  const schema = defineSchema({
    a: defineTable(
      v.union(v.object({ "a-b": v.string() }), v.object({ x: v.string() })),
    ),
  });
  expect(() => convexTest(schema)).toThrow();
});

test("index names must be identifiers", async () => {
  const schema = defineSchema({
    a: defineTable({ a: v.string() }).index("a-b", ["a"]),
  });
  expect(() => convexTest(schema)).toThrow();
});
