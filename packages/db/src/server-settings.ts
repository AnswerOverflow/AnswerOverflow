import type { ServerSettings } from "@answeroverflow/prisma-types";
import { bitfieldToDict, dictToBitfield, mergeFlags } from "./utils/bitfield";

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
