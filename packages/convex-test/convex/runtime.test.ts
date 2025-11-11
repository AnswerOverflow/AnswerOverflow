import { expect, test } from "vitest";
import { convexTest } from "../index";
import schema from "./schema";

test("Blob", async () => {
  const t = convexTest(schema);
  const result = await t.run(async () => {
    const obj = { hello: "world" };
    const blob = new Blob([JSON.stringify(obj, null, 2)], {
      type: "application/json",
    });
    return blob.size;
  });
  expect(result).toBe(22);
});

test("Event", async () => {
  const t = convexTest(schema);
  const result = await t.run(async () => {
    const event = new Event("click");
    return event.type;
  });
  expect(result).toBe("click");
});

test("EventTarget", async () => {
  const t = convexTest(schema);
  const result = await t.run(async () => {
    class MyEventTarget extends EventTarget {}
    const target = new MyEventTarget();
    let dispatched = false;
    target.addEventListener("click", () => {
      dispatched = true;
    });
    target.dispatchEvent(new Event("click"));
    return dispatched;
  });
  expect(result).toBe(true);
});

test("File", async () => {
  const t = convexTest(schema);
  const result = await t.run(async () => {
    const obj = { hello: "world" };
    const file = new File([JSON.stringify(obj, null, 2)], "hello.json", {
      type: "application/json",
    });
    return file.size;
  });
  expect(result).toBe(22);
});

test("FormData", async () => {
  const t = convexTest(schema);
  const result = await t.run(async () => {
    const formData = new FormData();
    formData.append("data", "hello world");
    return formData.get("data");
  });
  expect(result).toBe("hello world");
});

// TODO:
// ------------------
// Headers
// Request
// Response
// TextDecoder
// TextEncoder
// atob
// btoa
// ReadableStream
// ReadableStreamBYOBReader
// ReadableStreamDefaultReader
// TransformStream
// WritableStream
// WritableStreamDefaultWriter
// CryptoKey
// SubtleCrypto

test("crypto", async () => {
  const t = convexTest(schema);
  const result = await t.run(async () => {
    return crypto.randomUUID();
  });
  expect(result).toBeTypeOf("string");
});
