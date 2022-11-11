import { ChannelSettings } from "@prisma/client";
import { PermissionsBitField } from "../utils/bitfield";

export const ChannelSettingsFlags = {
  INDEXING_ENABLED: 1 << 0,
  MARK_SOLUTION_ENABLED: 1 << 1,
  SEND_MARK_SOLUTION_INSTRUCTIONS_IN_NEW_THREADS: 1 << 2,
  AUTO_THREAD_ENABLED: 1 << 3,
  CONSENT_PROMPT_IN_POST_GUIDELINES: 1 << 4,
};

export type ChannelSettingsWithBitfield = {
  bitfield: PermissionsBitField<typeof ChannelSettingsFlags>;
} & ChannelSettings;
