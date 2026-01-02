import { convexBetterAuthNextJs } from "@convex-dev/better-auth/nextjs";

const { getToken, isAuthenticated } = convexBetterAuthNextJs({
	convexUrl: process.env.NEXT_PUBLIC_CONVEX_URL ?? "",
	convexSiteUrl: process.env.NEXT_PUBLIC_CONVEX_SITE_URL ?? "",
	jwtCache: {
		enabled: true,
		expirationToleranceSeconds: 60,
		isAuthError: (error: unknown) => {
			if (error instanceof Error) {
				const message = error.message.toLowerCase();
				return (
					message.includes("unauthenticated") ||
					message.includes("unauthorized") ||
					message.includes("not authenticated")
				);
			}
			return false;
		},
	},
});

export { getToken, isAuthenticated };
