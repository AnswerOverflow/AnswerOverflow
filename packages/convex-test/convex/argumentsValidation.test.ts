import { expect, test } from "vitest";
import { convexTest } from "../index";
import { api } from "./_generated/api";
import schema from "./schema";
import counterSchema from "../counter/component/schema";

const counterModules = import.meta.glob("../counter/component/**/*.ts");

test("query arguments validation", async () => {
  const t = convexTest(schema);
  await expect(
    async () =>
      await t.query(api.argumentsValidation.queryWithArgs, { a: "bad" as any }),
  ).rejects.toThrowError("Validator error");
  await t.query(api.argumentsValidation.queryWithoutArgs, { a: "ok" } as any);
});

test("mutation arguments validation", async () => {
  const t = convexTest(schema);
  await expect(
    async () =>
      await t.mutation(api.argumentsValidation.mutationWithArgs, {
        a: 42,
        bad: 1,
      } as any),
  ).rejects.toThrowError("Validator error");
  await t.mutation(api.argumentsValidation.mutationWithoutArgs, {
    a: "ok",
  } as any);
});

test("action arguments validation", async () => {
  const t = convexTest(schema);
  await expect(
    async () =>
      await t.action(api.argumentsValidation.actionWithArgs, {} as any),
  ).rejects.toThrowError("Validator error");
  await t.action(api.argumentsValidation.actionWithoutArgs, { a: "ok" } as any);
});

test("optional fields", async () => {
  const t = convexTest(schema);
  const result = await t.query(
    api.argumentsValidation.queryWithOptionalArgs,
    {},
  );
  expect(result).toEqual("ok");
});

function testWithCounter() {
  const t = convexTest(schema);
  t.registerComponent("counter", counterSchema, counterModules);
  return t;
}

test("component mutation arguments validation", async () => {
  const t = testWithCounter();
  expect(
    await t.mutation(api.argumentsValidation.componentMutationWithNumberArg, {
      a: 42,
    }),
  ).toEqual(42);
  await expect(
    t.mutation(api.argumentsValidation.componentMutationWithNumberArg, {
      a: "bad" as any,
    }),
  ).rejects.toThrowError(/Validator error/);
  expect(
    await t.mutation(api.argumentsValidation.componentMutationWithNumberArg, {
      a: Number.POSITIVE_INFINITY,
    }),
  ).toEqual(Number.POSITIVE_INFINITY);
});

test("query with union arg", async () => {
  const t = testWithCounter();
  expect(
    await t.query(api.argumentsValidation.queryWithUnionArg, {
      a: 42,
    }),
  ).toEqual("ok");
  expect(
    await t.query(api.argumentsValidation.queryWithUnionArg, {
      a: "42",
    }),
  ).toEqual("ok");
  await expect(
    t.query(api.argumentsValidation.queryWithUnionArg, {
      a: null as any,
    }),
  ).rejects.toThrowError(/Validator error/);
});
