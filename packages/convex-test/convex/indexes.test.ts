import { expect, test } from "vitest";
import { convexTest } from "../index";
import schema from "./schema";

// TypeScript won't let you run into this error.
test("index must use only its fields", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("author", (q) =>
            (q.eq("author", "sarah") as any).eq("body", "hello1"),
          )
          .collect(),
    ).rejects.toThrow();
  });
});

// TypeScript won't let you run into this error.
test("index must use only its fields, by_id", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("by_id", (q) => (q as any).eq("_creationTime", 3))
          .collect(),
    ).rejects.toThrow();
  });
});

// TypeScript won't let you run into this error.
test("index must use only its fields, by_creation_time", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("by_creation_time", (q) => (q as any).eq("_id", 3))
          .collect(),
    ).rejects.toThrow();
  });
});

// TypeScript won't let you run into this error
test("_id is always last indexed field gt gt", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("author", (q) =>
            (q.eq("author", "sarah").gt("_creationTime", 3) as any).gt(
              "_id",
              "someId",
            ),
          )
          .collect(),
    ).rejects.toThrow();
  });
});

// TypeScript won't let you run into this error
test("_id is always last indexed field lt lt", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("author", (q) =>
            (q.eq("author", "sarah").lt("_creationTime", 3) as any).lt(
              "_id",
              "someId",
            ),
          )
          .collect(),
    ).rejects.toThrow();
  });
});

// TypeScript won't let you run into this error
test("_id is always last indexed field lt gt", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("author", (q) =>
            (q.eq("author", "sarah").lt("_creationTime", 3) as any).gt(
              "_id",
              "someId",
            ),
          )
          .collect(),
    ).rejects.toThrow();
  });
});

// TypeScript won't let you run into this error
test("_id is always last indexed field gt lt", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("author", (q) =>
            (q.eq("author", "sarah").lt("_creationTime", 3) as any).eq(
              "_id",
              "someId",
            ),
          )
          .collect(),
    ).rejects.toThrow();
  });
});

test("gt,lt in range of indexed field", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    // do not throw
    await ctx.db
      .query("messages")
      .withIndex("author", (q) =>
        q.gt("author", "nipunn").lt("author", "sarah"),
      )
      .collect();
  });
});

// TypeScript won't let you do this because we wanted
// to keep the types simple, but it is runtime-wise correct.
// Typescript makes you do gt before lt
test("lt,gt in range of indexed field", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    // do not throw
    await ctx.db
      .query("messages")
      .withIndex("author", (q) =>
        (q.lt("author", "nipunn") as any).gt("author", "sarah"),
      )
      .collect();
  });
});

// TypeScript won't let you run into this error
test("gt,lt,lt in range of indexed field", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await expect(
      async () =>
        await ctx.db
          .query("messages")
          .withIndex("author", (q) =>
            (q.gt("author", "nipunn").lt("author", "sarah") as any).gt(
              "author",
              "aaa",
            ),
          )
          .collect(),
    ).rejects.toThrow(
      "cannot chain more operators after both `.gt` and `.lt` were already used",
    );
  });
});
