import { createAuth } from "@packages/database/convex/betterAuth";
import { getToken as getTokenNextjs } from "@convex-dev/better-auth/nextjs";

export const getToken = () => {
	return getTokenNextjs(createAuth);
};
