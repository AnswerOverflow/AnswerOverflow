"use client";

import { convexClient } from "@convex-dev/better-auth/client/plugins";
import { ConvexBetterAuthProvider } from "@convex-dev/better-auth/react";
import { ConvexQueryClient } from "@convex-dev/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createAuthClient } from "better-auth/react";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";

// biome-ignore lint/style/noNonNullAssertion: Setup
const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!, {
	// Don't pause queries until authenticated - let them fail naturally if needed
	expectAuth: false,
});
const convexQueryClient = new ConvexQueryClient(convex);
const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			queryKeyHashFn: convexQueryClient.hashFn(),
			queryFn: convexQueryClient.queryFn(),
		},
	},
});

convexQueryClient.connect(queryClient);

type AuthClientType = React.ComponentProps<typeof ConvexBetterAuthProvider>["authClient"];

export const authClient: AuthClientType = createAuthClient({
	plugins: [convexClient()],
});

export function ConvexClientProvider({ children }: { children: ReactNode }) {
	return (
		<ConvexProvider client={convex}>
			<ConvexBetterAuthProvider client={convex} authClient={authClient}>
				<QueryClientProvider client={queryClient}>
					{children}
				</QueryClientProvider>
			</ConvexBetterAuthProvider>
		</ConvexProvider>
	);
}
