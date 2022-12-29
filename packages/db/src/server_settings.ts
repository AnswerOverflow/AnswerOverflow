import type { ServerSettings } from "@prisma/client";
import { bitfieldToDict, dictToBitfield } from "./utils/bitfield";

export const server_settings_flags = ["read_the_rules_consent_enabled"] as const;

export const bitfieldToserverSettingsFlags = (bitfield: number) =>
  bitfieldToDict(bitfield, server_settings_flags);

export function addserverSettingsFlagsToserverSettings<T extends ServerSettings>(
  server_settings: T
) {
  return {
    ...server_settings,
    flags: bitfieldToserverSettingsFlags(server_settings.bitfield),
  };
}

export function mergeServerSettingsFlags(old: number, new_flags: Record<string, boolean>) {
  return mergeFlags(
    () => bitfieldToserverSettingsFlags(old),
    new_flags,
    (flags) => dictToBitfield(flags, server_settings_flags)
  );
}

export function mergeFlags(
  getOldFlags: () => Record<string, boolean>,
  new_flags: Record<string, boolean>,
  // eslint-disable-next-line no-unused-vars
  flagsToBitfield: (flags: Record<string, boolean>) => number
) {
  const old_flags = getOldFlags();
  const merged_flags = { ...old_flags, ...new_flags };
  return flagsToBitfield(merged_flags);
}
