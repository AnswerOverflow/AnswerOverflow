/// <reference types="vite/client" />
import { test } from "vitest";
import { convexTest } from "convex-test";
export const modules = import.meta.glob("./**/*.*s");

import {
	defineSchema,
	type GenericSchema,
	type SchemaDefinition,
} from "convex/server";
import { type AgentComponent } from "./index";
import { componentsGeneric } from "convex/server";
export { componentSchema };
import componentSchema from "../component/schema";
export const componentModules = import.meta.glob("../component/**/*.ts");

export function initConvexTest<
	Schema extends SchemaDefinition<GenericSchema, boolean>,
>(schema?: Schema) {
	const t = convexTest(schema ?? defineSchema({}), modules);
	t.registerComponent("agent", componentSchema, componentModules);
	return t;
}
export const components = componentsGeneric() as unknown as {
	agent: AgentComponent;
};

test("setup", () => {});
