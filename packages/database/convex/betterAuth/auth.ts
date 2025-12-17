import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { admin, anonymous } from "better-auth/plugins";

const options = {
	logger: {
		disabled: true,
	},
	database: convexAdapter({} as never, {} as never),
	plugins: [
		convex(),
		anonymous({
			disableDeleteAnonymousUser: true,
		}),
		admin({
			impersonationSessionDuration: 60 * 60,
		}),
	],
} as BetterAuthOptions;

export const auth = betterAuth(options) as ReturnType<typeof betterAuth>;
