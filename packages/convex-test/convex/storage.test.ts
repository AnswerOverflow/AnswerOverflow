import { expect, test } from "vitest";
import { convexTest } from "../index";
import { internal } from "./_generated/api";
import schema from "./schema";

test("action store blob", async () => {
  const t = convexTest(schema);
  const bytes = new Uint8Array([0b00001100, 0b00000000]).buffer;
  const storageId = await t.action(internal.storage.actionStoreBlob, { bytes });
  const result = await t.query(internal.storage.listFiles);
  expect(result).toMatchObject([
    {
      _id: storageId,
      sha256: "v2DkNJys5rzg1VLo14NCjbZtDWSb2eQwo2J+LuFKyDk=",
      size: 2,
    },
  ]);
});

test("action get blob", async () => {
  const t = convexTest(schema);
  const bytes = new Uint8Array([0b00001100, 0b00000000]).buffer;
  const storageId = await t.action(internal.storage.actionStoreBlob, { bytes });
  const result = await t.action(internal.storage.actionGetBlob, {
    id: storageId,
  });
  expect(result).toEqual(bytes);
});

test("action delete blob", async () => {
  const t = convexTest(schema);
  const bytes = new Uint8Array([0b00001100, 0b00000000]).buffer;
  const storageId = await t.action(internal.storage.actionStoreBlob, { bytes });
  await t.action(internal.storage.actionDeleteBlob, { id: storageId });
  const result = await t.action(internal.storage.actionGetBlob, {
    id: storageId,
  });
  expect(result).toBeNull();
});

test("mutation delete blob", async () => {
  const t = convexTest(schema);
  const storageId = await t.run(async (ctx) => {
    const bytes = new Uint8Array([0b00001100, 0b00000000]).buffer;
    return await ctx.storage.store(new Blob([bytes]));
  });
  await t.mutation(internal.storage.mutationDeleteBlob, { id: storageId });
  const result = await t.action(internal.storage.actionGetBlob, {
    id: storageId,
  });
  expect(result).toBeNull();
});

test("query get URL", async () => {
  const t = convexTest(schema);
  const bytes = new Uint8Array([0b00001100, 0b00000000]).buffer;
  const id = await t.action(internal.storage.actionStoreBlob, { bytes });
  {
    const result = await t.query(internal.storage.queryGetUrl, { id });
    expect(result).toMatch("https://");
  }
  await t.mutation(internal.storage.mutationDeleteBlob, { id });
  {
    const result = await t.query(internal.storage.queryGetUrl, { id });
    expect(result).toBeNull();
  }
});

test("mutation generate upload URL", async () => {
  const t = convexTest(schema);
  const result = await t.mutation(internal.storage.mutationGenerateUploadUrl);
  expect(result).toMatch("https://");
});
