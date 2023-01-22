import type { z } from "zod";
import type { z_channel, z_channel_public } from "./channel";

export type ChannelAll = z.infer<typeof z_channel>;
export type ChannelPublic = z.infer<typeof z_channel_public>;
