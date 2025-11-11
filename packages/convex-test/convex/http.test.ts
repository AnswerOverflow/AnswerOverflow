import { expect, test } from "vitest";
import { convexTest } from "../index";
import schema from "./schema";

test("simple", async () => {
  const t = convexTest(schema);
  const response = await t.fetch("/foo?arg=hello", { method: "GET" });
  expect(await response.text()).toEqual("hello");
});

test("json body", async () => {
  const t = convexTest(schema);
  const response = await t.fetch("/buzz", {
    method: "POST",
    body: JSON.stringify({ text: "hello" }),
    headers: { "Content-Type": "application/json" },
  });
  expect(await response.text()).toEqual("hello");
});

test("path prefix", async () => {
  const t = convexTest(schema);
  const response = await t.fetch("/bla/hello", { method: "POST" });
  expect(await response.text()).toEqual("hello");
});

test("http action runs query", async () => {
  const t = convexTest(schema);
  await t.run(async (ctx) => {
    await ctx.db.insert("messages", { author: "mike", body: "hello" });
  });
  const response = await t.fetch("/readQuery", { method: "POST" });
  const message = await response.json();
  expect(message.body).toEqual("hello");
});
