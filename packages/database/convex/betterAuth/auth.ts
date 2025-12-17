import { convexAdapter } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { admin, anonymous } from "better-auth/plugins";

// This is a STUB configuration used only for schema type inference by the
// vendored @convex-dev/better-auth component. It does NOT run at runtime.
// The real auth configuration with secrets, OAuth providers, and hooks is in:
// packages/database/convex/shared/betterAuth.ts
//
// Keep `user.additionalFields` and `plugins` in sync with the real config.
const options = {
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
