import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  messages: defineTable({
    author: v.string(),
    body: v.string(),
    embedding: v.optional(v.array(v.number())),
    score: v.optional(v.number()),
  })
    .index("author", ["author"])
    .searchIndex("body", {
      searchField: "body",
      filterFields: ["author"],
    })
    .vectorIndex("embedding", {
      vectorField: "embedding",
      filterFields: ["author", "body"],
      dimensions: 1536,
    }),
});
