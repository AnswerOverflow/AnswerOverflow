import { zServerPublic } from "@answeroverflow/core/zod";
import type { z } from "zod";

export type ServerPublic = z.infer<typeof zServerPublic>;
