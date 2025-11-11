import { createAuthClient } from "better-auth/react";
import { convexClient } from "@convex-dev/better-auth/client/plugins";

export const authClient: ReturnType<typeof createAuthClient> = createAuthClient({
	plugins: [convexClient()],
});


