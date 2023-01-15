import type { z } from "zod";
import type { z_message_with_discord_account } from "./message";

export type MessageWithDiscordAccount = z.infer<typeof z_message_with_discord_account>;
