import type { z_server, z_server_public } from "@answeroverflow/db";
import type { z } from "zod";

export type ServerAll = z.infer<typeof z_server>;
export type ServerPublic = z.infer<typeof z_server_public>;
