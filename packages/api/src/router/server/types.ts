import type { zServer, zServerPublic } from "@answeroverflow/db";
import type { z } from "zod";

export type ServerAll = z.infer<typeof zServer>;
export type ServerPublic = z.infer<typeof zServerPublic>;
