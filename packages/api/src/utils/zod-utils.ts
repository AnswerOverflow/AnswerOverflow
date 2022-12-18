import { toDict } from "@answeroverflow/db";
import { z } from "zod";
export function toZObject<T extends readonly string[]>(
  ...keys: T
): z.ZodObject<Record<T[number], z.ZodOptional<z.ZodBoolean>>> {
  return z.object(toDict(() => z.boolean().optional(), ...keys));
}
