import type {
  z_channel,
  z_channel_public,
  z_channel_public_with_settings,
  z_channel_settings,
} from "@answeroverflow/db";
import type { z } from "zod";

export type ChannelAll = z.infer<typeof z_channel>;
export type ChannelPublic = z.infer<typeof z_channel_public>;
export type ChannelPublicWithSettings = z.infer<typeof z_channel_public_with_settings>;
export type ChannelSettingsWithFlags = z.infer<typeof z_channel_settings>;
