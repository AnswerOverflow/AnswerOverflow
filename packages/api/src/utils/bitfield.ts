import { BitField } from "@sapphire/bitfield";
import { z } from "zod";

function toDict<T extends readonly string[], Result>(
  // eslint-disable-next-line no-unused-vars
  operation: (key: T[number], index: number) => Result,
  ...keys: T
): Record<T[number], Result> {
  const obj: Record<string, Result> = {};
  for (let i = 0; i < keys.length; i++) {
    obj[keys[i]] = operation(keys[i], i);
  }
  return obj;
}

export function toBitfield<T extends readonly string[]>(...keys: T): Record<T[number], number> {
  return toDict((_key, index) => 1 << index, ...keys);
}

export function toZObject<T extends readonly string[]>(
  ...keys: T
): z.ZodObject<Record<T[number], z.ZodOptional<z.ZodBoolean>>> {
  return z.object(toDict(() => z.boolean().optional(), ...keys));
}

export function bitfieldToDict<T extends readonly string[]>(
  value: number,
  flags: T
): Record<T[number], boolean> {
  const bitfield = new BitField(toBitfield(...flags));
  return toDict((key) => bitfield.has(value, key), ...flags);
}

export function dictToBitfield<
  T extends readonly string[],
  FlagDict extends Record<T[number], boolean>
>(dict: FlagDict, flags: T) {
  const bitfield = new BitField(toBitfield(...flags));
  const enabled_flags: string[] = [];
  for (const key in dict) {
    if (dict[key]) {
      enabled_flags.push(key);
    }
  }
  return bitfield.resolve(enabled_flags) as number; // TODO: Possibly a bug? Needs to be revisited if bitfields ever exceed the size of a number
}
