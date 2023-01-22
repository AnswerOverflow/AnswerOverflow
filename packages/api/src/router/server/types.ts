import type { z } from "zod";
import type { z_server_public, z_server } from "./server";

export type ServerAll = z.infer<typeof z_server>;
export type ServerPublic = z.infer<typeof z_server_public>;
