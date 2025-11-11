import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";
import { createAuth } from "@packages/database/convex/shared/betterAuth";

export const getToken = () => {
	return getTokenNextjs(createAuth);
};
