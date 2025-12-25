import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { admin, anonymous, apiKey } from "better-auth/plugins";
import authConfig from "../auth.config";

export const createAuthOptions = (_ctx: unknown): BetterAuthOptions => ({
	logger: {
		disabled: true,
	},
	database: convexAdapter({} as never, {} as never),
	user: {
		additionalFields: {
			role: {
				type: "string",
				required: false,
			},
		},
	},
	plugins: [
		convex({ authConfig }),
		anonymous({
			disableDeleteAnonymousUser: true,
		}),
		admin({
			impersonationSessionDuration: 60 * 60,
		}),
		apiKey({
			defaultPrefix: "user_",
			enableSessionForAPIKeys: true,
			enableMetadata: false,
			rateLimit: {
				enabled: false,
			},
		}),
	],
});

export const auth = betterAuth({
	...createAuthOptions({}),
	secret: "cli-only-dummy-secret-not-used-at-runtime",
});
