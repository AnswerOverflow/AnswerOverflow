/// <reference types="vite/client" />
import { test } from "vitest";
export const modules = import.meta.glob("./**/*.*s");

test("setup", () => {});
