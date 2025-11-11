import { expect, test } from "vitest";
import { convexTest } from "../index";
import schema from "./schema";
import { api } from "./_generated/api";

test("generated attributes", async () => {
  const t = convexTest(schema);
  const asSarah = t.withIdentity({ name: "Sarah" });
  const attributes = await asSarah.run((ctx) => {
    return ctx.auth.getUserIdentity();
  });
  expect(attributes).toMatchObject({ name: "Sarah" });
  expect(attributes!.tokenIdentifier).toBeTypeOf("string");
  expect(attributes!.subject).toBeTypeOf("string");
  expect(attributes!.issuer).toBeTypeOf("string");
});

test("action calling query", async () => {
  const t = convexTest(schema);
  const asSarah = t.withIdentity({ name: "Sarah" });
  const name = await asSarah.action(api.authentication.actionCallingQuery);
  expect(name).toEqual("Sarah");
});

test("action calling mutation", async () => {
  const t = convexTest(schema);
  const asSarah = t.withIdentity({ name: "Sarah" });
  const name = await asSarah.action(api.authentication.actionCallingMutation);
  expect(name).toEqual("Sarah");
});

test("action calling action", async () => {
  const t = convexTest(schema);
  const asSarah = t.withIdentity({ name: "Sarah" });
  const name = await asSarah.action(api.authentication.actionCallingAction);
  expect(name).toEqual("Sarah");
});
