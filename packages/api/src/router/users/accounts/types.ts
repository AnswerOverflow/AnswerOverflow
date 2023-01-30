import type { z_discord_account_public } from "@answeroverflow/db";
import type { z } from "zod";

export type DiscordAccountPublic = z.infer<typeof z_discord_account_public>;
