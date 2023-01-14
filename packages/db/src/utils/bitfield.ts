import { BitField } from "@sapphire/bitfield";

export function toDict<T extends readonly string[], Result>(
  operation: (key: T[number], index: number) => Result,
  ...keys: T
): Record<T[number], Result> {
  const obj: Record<string, Result> = {};
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]!;
    obj[key] = operation(key, i);
  }
  return obj as Record<T[number], Result>;
}

export function toBitfield<T extends readonly string[]>(...keys: T): Record<T[number], number> {
  return toDict((_key, index) => 1 << index, ...keys) as Record<T[number], number>;
}

export function bitfieldToDict<T extends readonly string[]>(
  value: number,
  flags: T
): Record<T[number], boolean> {
  const bitfield = new BitField(toBitfield(...flags));
  return toDict((key) => bitfield.has(value, key), ...flags) as Record<T[number], boolean>;
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

export function mergeFlags(
  getOldFlags: () => Record<string, boolean>,
  new_flags: Record<string, boolean>,
  flagsToBitfield: (flags: Record<string, boolean>) => number
) {
  const old_flags = getOldFlags();
  const merged_flags = { ...old_flags, ...new_flags };
  return flagsToBitfield(merged_flags);
}
