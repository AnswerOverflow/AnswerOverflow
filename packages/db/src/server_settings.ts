import type { ServerSettings } from "@prisma/client";
import { bitfieldToDict } from "./utils/bitfield";

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
