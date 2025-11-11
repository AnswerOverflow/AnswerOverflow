import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  counters: defineTable({
    name: v.string(),
    value: v.number(),
    shard: v.number(),
  }).index("name", ["name", "shard"]),
});
