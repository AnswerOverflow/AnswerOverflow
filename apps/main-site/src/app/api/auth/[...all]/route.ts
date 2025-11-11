import { nextJsHandler } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@packages/database/convex/shared/betterAuth";

// @ts-expect-error - nextJsHandler expects a different signature but createAuth works at runtime
export const { GET, POST } = nextJsHandler(createAuth);
