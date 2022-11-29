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
  return toDict((key, index) => 1 << index, ...keys);
}

export function toZObject<T extends readonly string[]>(
  ...keys: T
): z.ZodObject<Record<T[number], z.ZodOptional<z.ZodBoolean>>> {
  return z.object(toDict(() => z.boolean().optional(), ...keys));
}

export function bitfieldToDict<Flags extends readonly string[]>(
  value: number,
  flags: Flags
): Record<Flags[number], boolean> {
  const bitfield = new BitField(toBitfield(...flags));
  return toDict((key) => bitfield.has(value, key), ...flags);
}

export function enableBitfieldFlag<Flags extends Record<string, number>>(
  value: number,
  flags: Flags,
  flag_to_enable: keyof Flags
) {
  const bitfield = new BitField(flags);
  return bitfield.resolve([value, flag_to_enable as string]);
}

export function disableBitfieldFlag<Flags extends Record<string, number>>(
  value: number,
  flags: Flags,
  flag_to_disable: keyof Flags
) {
  const bitfield = new BitField(flags);
  return bitfield.intersection(value, bitfield.complement(flag_to_disable as string));
}

export function mergeBitfields<Flags extends Record<string, number>>(
  old_value: number,
  new_value: number,
  flags: Flags
) {
  const bitfield = new BitField(flags);
  return bitfield.resolve([old_value, new_value]);
}
