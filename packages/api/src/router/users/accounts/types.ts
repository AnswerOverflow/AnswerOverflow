import type { z } from "zod";
import type { z_discord_account_public } from "./discord-accounts";

export type DiscordAccountPublic = z.infer<typeof z_discord_account_public>;
